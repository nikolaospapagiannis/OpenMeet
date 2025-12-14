# Disaster Recovery Runbook

## Overview
This runbook provides step-by-step procedures for disaster recovery scenarios in the OpenMeet platform.

**RTO Target:** < 5 minutes
**RPO Target:** < 1 minute

---

## Table of Contents
1. [Emergency Contacts](#emergency-contacts)
2. [Quick Reference](#quick-reference)
3. [Database Failure Recovery](#database-failure-recovery)
4. [API Outage Recovery](#api-outage-recovery)
5. [Storage Failure Recovery](#storage-failure-recovery)
6. [Regional Failover](#regional-failover)
7. [Complete Disaster Recovery](#complete-disaster-recovery)

---

## Emergency Contacts

| Role | Contact | Phone | Slack |
|------|---------|-------|-------|
| On-Call Engineer | PagerDuty | - | @oncall |
| Database Lead | TBD | TBD | @db-lead |
| DevOps Lead | TBD | TBD | @devops-lead |
| CTO | TBD | TBD | @cto |

---

## Quick Reference

### Critical Commands
```bash
# Check cluster status
kubectl get pods -n openmeet-production

# Check database health
kubectl exec -n openmeet-production postgres-patroni-0 -- patronictl list

# Check API health
curl https://api.openmeet.com/health

# Run automated incident response
/home/user/openmeet-v2/infrastructure/scripts/incident-response.sh

# Test RTO/RPO compliance
/home/user/openmeet-v2/infrastructure/scripts/rto-rpo-test.sh
```

### Backup Locations
- **Primary S3 Bucket:** `s3://openmeet-backups-us-east-1`
- **Secondary S3 Bucket:** `s3://openmeet-backups-us-west-2`
- **Local Backups:** `/var/backups/openmeet`

---

## Database Failure Recovery

### Severity: CRITICAL
**RTO:** 3-5 minutes
**RPO:** 0-30 seconds (streaming replication)

### Symptoms
- PostgreSQL primary unresponsive
- Connection timeouts to database
- Application errors: "database unavailable"

### Automated Recovery
Patroni automatically promotes a replica to primary when the leader fails.

### Manual Steps (if automated failover fails)

#### Step 1: Verify Cluster Status
```bash
kubectl exec -n openmeet-production postgres-patroni-0 -- patronictl list
```

Expected output should show:
- 1 Leader
- 2 Replicas
- All in "running" state

#### Step 2: Identify Failed Node
```bash
kubectl get pods -n openmeet-production -l app=postgres
```

Look for pods in `CrashLoopBackOff` or `Error` state.

#### Step 3: Manual Failover (if needed)
```bash
# Promote specific replica
kubectl exec -n openmeet-production postgres-patroni-1 -- \
    patronictl failover --candidate postgres-patroni-1 --force

# Wait for failover to complete (30-60 seconds)
sleep 60

# Verify new leader
kubectl exec -n openmeet-production postgres-patroni-1 -- patronictl list
```

#### Step 4: Verify Application Connectivity
```bash
kubectl exec -n openmeet-production api-deployment-xxx -- \
    psql -h postgres-master -U postgres -c "SELECT 1"
```

#### Step 5: Restore Failed Node
```bash
# Delete failed pod to trigger recreation
kubectl delete pod postgres-patroni-0 -n openmeet-production

# Wait for pod to restart
kubectl wait --for=condition=ready pod/postgres-patroni-0 -n openmeet-production --timeout=300s

# Verify it rejoins as replica
kubectl exec -n openmeet-production postgres-patroni-0 -- patronictl list
```

### Post-Recovery Checklist
- [ ] All 3 PostgreSQL nodes running
- [ ] 1 Leader, 2 Replicas
- [ ] Replication lag < 60 seconds
- [ ] Application database queries successful
- [ ] Incident documented

---

## API Outage Recovery

### Severity: HIGH
**RTO:** 2-3 minutes
**RPO:** N/A (stateless)

### Symptoms
- API health check failing
- HTTP 502/503 errors
- Application frontend errors

### Automated Recovery
Kubernetes automatically restarts failed API pods.

### Manual Steps

#### Step 1: Check Pod Status
```bash
kubectl get pods -n openmeet-production -l app=api
kubectl describe pod <failing-pod> -n openmeet-production
```

#### Step 2: Check Recent Events
```bash
kubectl get events -n openmeet-production --sort-by='.lastTimestamp' | grep api
```

#### Step 3: Check Logs
```bash
kubectl logs -n openmeet-production <pod-name> --tail=100
```

#### Step 4: Restart Failed Pods
```bash
# Delete failed pods (they will auto-recreate)
kubectl delete pod -n openmeet-production -l app=api --field-selector=status.phase!=Running

# Wait for new pods
kubectl wait --for=condition=ready pod -l app=api -n openmeet-production --timeout=120s
```

#### Step 5: Scale Up (if needed)
```bash
# Increase replicas temporarily
kubectl scale deployment api -n openmeet-production --replicas=5

# Monitor resource usage
kubectl top pods -n openmeet-production -l app=api
```

#### Step 6: Verify Recovery
```bash
curl -v https://api.openmeet.com/health
```

### Root Cause Analysis
Common causes:
- Out of memory (OOM)
- Database connection pool exhausted
- External API dependency failure
- CPU throttling

Check metrics in Grafana and review logs for root cause.

---

## Storage Failure Recovery

### Severity: HIGH
**RTO:** 10-15 minutes
**RPO:** Based on last backup

### Symptoms
- "No space left on device" errors
- Pod evictions
- PVC provisioning failures

### Manual Steps

#### Step 1: Check Disk Usage
```bash
# On Kubernetes nodes
kubectl get nodes
kubectl describe node <node-name> | grep -A 10 "Allocated resources"

# Check PVC usage
kubectl get pvc -n openmeet-production
```

#### Step 2: Clean Up Space

```bash
# Clean old Docker images
docker system prune -af --volumes

# Clean old logs
find /var/log -name "*.log" -mtime +7 -delete

# Clean old backups (keep last 30 days)
find /var/backups/openmeet -mtime +30 -delete
```

#### Step 3: Expand PVC (if needed)
```bash
# Edit PVC
kubectl edit pvc postgres-pvc -n openmeet-production

# Increase size (e.g., from 100Gi to 200Gi)
spec:
  resources:
    requests:
      storage: 200Gi
```

#### Step 4: Restore from Backup (if data loss)
```bash
# Run restore script
/home/user/openmeet-v2/infrastructure/scripts/restore-postgres.sh \
    --timestamp 20250115_120000 \
    --source s3
```

---

## Regional Failover

### Severity: CRITICAL
**RTO:** 5-10 minutes
**RPO:** Based on cross-region replication lag

### Symptoms
- Primary region AWS outage
- Route53 health checks failing
- High latency from primary region

### Automated Recovery
Route53 automatically fails over to secondary region when primary health checks fail.

### Manual Steps

#### Step 1: Verify Primary Region Status
```bash
# Check primary region health
curl https://primary.openmeet.com/health

# Check AWS status page
open https://status.aws.amazon.com
```

#### Step 2: Verify Secondary Region is Ready
```bash
# Switch to secondary cluster context
kubectl config use-context openmeet-secondary

# Check pod status
kubectl get pods -n openmeet-production

# Verify database is up
kubectl exec -n openmeet-production postgres-patroni-0 -- pg_isready
```

#### Step 3: Update DNS (if automated failover didn't trigger)
```bash
# Update Route53 to point to secondary
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch file://failover-dns.json
```

#### Step 4: Promote Secondary Database to Primary
```bash
# Promote read replica to standalone
aws rds promote-read-replica \
    --db-instance-identifier openmeet-production-secondary-replica \
    --region us-west-2

# Wait for promotion (5-10 minutes)
aws rds wait db-instance-available \
    --db-instance-identifier openmeet-production-secondary-replica \
    --region us-west-2
```

#### Step 5: Update Application Configuration
```bash
# Update database connection strings in secrets
kubectl create secret generic openmeet-secrets \
    --from-literal=postgres-host=<secondary-db-endpoint> \
    --dry-run=client -o yaml | kubectl apply -f -

# Restart application pods
kubectl rollout restart deployment/api -n openmeet-production
```

#### Step 6: Verify Global Endpoint
```bash
curl https://api.openmeet.com/health
dig api.openmeet.com  # Verify DNS points to secondary
```

### Post-Failover Checklist
- [ ] Secondary region serving traffic
- [ ] Database promoted to primary
- [ ] All services healthy
- [ ] Data integrity verified
- [ ] Monitoring alerts updated
- [ ] Stakeholders notified

---

## Complete Disaster Recovery

### Severity: CATASTROPHIC
**RTO:** 1-2 hours
**RPO:** Based on last backup (target: <1 hour)

### Scenario: Complete data center loss or catastrophic failure

### Step 1: Activate DR Team
- Alert all hands on deck
- Notify stakeholders and customers
- Open incident channel in Slack: #incident-dr

### Step 2: Deploy to Tertiary Region
```bash
# Deploy infrastructure
cd /home/user/openmeet-v2/infrastructure/terraform
terraform workspace select tertiary
terraform apply

# Deploy Kubernetes resources
kubectl config use-context openmeet-tertiary
kubectl apply -f /home/user/openmeet-v2/infrastructure/k8s/production/
```

### Step 3: Restore Latest Backups
```bash
# Restore PostgreSQL
/home/user/openmeet-v2/infrastructure/scripts/restore-postgres.sh \
    --timestamp $(aws s3 ls s3://openmeet-backups-us-east-1/postgres/dump/ | tail -1 | awk '{print $4}' | grep -oP '\d{8}_\d{6}') \
    --source s3

# Restore MongoDB
/home/user/openmeet-v2/infrastructure/scripts/restore-mongodb.sh \
    --timestamp $(aws s3 ls s3://openmeet-backups-us-east-1/mongodb/ | tail -1 | awk '{print $4}' | grep -oP '\d{8}_\d{6}') \
    --source s3

# Restore Redis
/home/user/openmeet-v2/infrastructure/scripts/restore-redis.sh \
    --timestamp $(aws s3 ls s3://openmeet-backups-us-east-1/redis/ | tail -1 | awk '{print $4}' | grep -oP '\d{8}_\d{6}') \
    --source s3
```

### Step 4: Verify Data Integrity
```bash
# Run verification queries
kubectl exec -n openmeet-production postgres-patroni-0 -- psql -U postgres -d openmeet -c "SELECT COUNT(*) FROM users;"
kubectl exec -n openmeet-production postgres-patroni-0 -- psql -U postgres -d openmeet -c "SELECT MAX(created_at) FROM users;"

# Compare with pre-disaster metrics
```

### Step 5: Update Global DNS
```bash
# Point DNS to tertiary region
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.openmeet.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z<tertiary-lb-zone>",
            "DNSName": "<tertiary-lb-dns>",
            "EvaluateTargetHealth": true
          }
        }
      }]
    }'

# Wait for DNS propagation (5-10 minutes)
```

### Step 6: Enable Monitoring
```bash
# Deploy monitoring stack
kubectl apply -f /home/user/openmeet-v2/infrastructure/k8s/production/monitoring.yaml

# Verify Grafana and Prometheus
kubectl port-forward -n openmeet-production svc/grafana 3000:3000
```

### Step 7: Communication
- Update status page
- Notify customers via email
- Post mortem within 48 hours

### Recovery Time Estimate
- Infrastructure deployment: 20-30 minutes
- Database restore: 30-45 minutes
- Application deployment: 10-15 minutes
- DNS propagation: 5-10 minutes
- **Total RTO:** 65-100 minutes

---

## Appendix

### Useful Commands

```bash
# Check all resource usage
kubectl top nodes
kubectl top pods -n openmeet-production

# Get all events
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Backup verification
aws s3 ls s3://openmeet-backups-us-east-1/postgres/dump/ --recursive --human-readable

# Replication lag
kubectl exec -n openmeet-production postgres-patroni-1 -- psql -U postgres -c "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), pg_last_xact_replay_timestamp();"
```

### Monitoring Dashboards
- **Grafana:** https://monitoring.openmeet.com
- **Patroni Dashboard:** `kubectl port-forward -n openmeet-production svc/postgres-patroni 8008:8008`
- **Chaos Mesh:** `kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333`

### Backup Schedule
- **PostgreSQL:** Every 6 hours
- **MongoDB:** Every 6 hours
- **Redis:** Every 6 hours
- **WAL Archive:** Continuous
- **RTO/RPO Tests:** Weekly (Sunday 2 AM)

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-15 | DR Team | Initial version |

**Last Tested:** 2025-01-15
**Next Review:** 2025-02-15
