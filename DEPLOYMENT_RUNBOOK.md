# OpenMeet Platform - Deployment Runbook

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring and Alerts](#monitoring-and-alerts)
8. [Troubleshooting](#troubleshooting)

## 🔒 Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage ≥ 80%
- [ ] No critical security vulnerabilities
- [ ] Code review approved
- [ ] CI/CD pipeline green

### Security
- [ ] Environment variables configured
- [ ] Secrets rotated if needed
- [ ] SSL certificates valid
- [ ] Security scan completed
- [ ] API rate limits configured

### Infrastructure
- [ ] Database backups recent (<24 hours)
- [ ] Monitoring dashboards configured
- [ ] Alert rules in place
- [ ] Resource quotas set
- [ ] Auto-scaling configured

### Communication
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled
- [ ] Status page updated
- [ ] Rollback plan documented

## 🌍 Environment Setup

### Prerequisites

```bash
# Required tools
- kubectl (v1.28+)
- aws-cli (v2.0+)
- docker (v24.0+)
- helm (v3.12+)

# Required access
- AWS credentials configured
- Kubernetes cluster access
- Docker registry credentials
- Database admin credentials
```

### Configure kubectl

```bash
# Update kubeconfig for production cluster
aws eks update-kubeconfig --name openmeet-production --region us-east-1

# Verify access
kubectl get nodes
kubectl get pods -n openmeet-production
```

### Set Environment Variables

```bash
export ENVIRONMENT=production
export NAMESPACE=openmeet-production
export VERSION=$(cat VERSION)  # e.g., 1.2.3
export IMAGE_TAG=sha-$(git rev-parse --short HEAD)
```

## 🗄️ Database Migration

### 1. Backup Current Database

```bash
# Run backup script
./infrastructure/scripts/backup/backup-database.sh

# Verify backup created
aws s3 ls s3://openmeet-backups/postgres/ | tail -5

# Test backup integrity
./infrastructure/scripts/backup/restore-database.sh --test
```

### 2. Run Migrations

```bash
# Connect to database pod
kubectl exec -it postgres-0 -n $NAMESPACE -- /bin/bash

# Run Prisma migrations
cd /app
npx prisma migrate deploy

# Verify migrations
npx prisma migrate status

# Exit pod
exit
```

### 3. Verify Database State

```bash
# Check for migration errors
kubectl logs -n $NAMESPACE deployment/api-deployment --tail=100 | grep -i migration

# Test database connectivity
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL -c "SELECT version();"
```

## 🚀 Application Deployment

### Option A: Rolling Update (Zero Downtime)

```bash
# 1. Update image tags
kubectl set image deployment/api-deployment \
  api=ghcr.io/company/openmeet/api:$IMAGE_TAG \
  -n $NAMESPACE

kubectl set image deployment/web-deployment \
  web=ghcr.io/company/openmeet/web:$IMAGE_TAG \
  -n $NAMESPACE

# 2. Watch rollout status
kubectl rollout status deployment/api-deployment -n $NAMESPACE
kubectl rollout status deployment/web-deployment -n $NAMESPACE

# 3. Verify new pods are running
kubectl get pods -n $NAMESPACE -w
```

### Option B: Blue-Green Deployment

```bash
# 1. Deploy green environment
kubectl apply -f infrastructure/k8s/production-green/

# 2. Wait for green to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/api-deployment-green -n $NAMESPACE

# 3. Run smoke tests on green
./infrastructure/scripts/smoke-test.sh green

# 4. Switch traffic to green
kubectl patch service api-service -n $NAMESPACE \
  -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Monitor for issues (5 minutes)
sleep 300

# 6. If successful, delete blue
kubectl delete -f infrastructure/k8s/production-blue/
```

### Option C: Canary Deployment

```bash
# 1. Deploy canary with 10% traffic
kubectl apply -f infrastructure/k8s/canary/

# 2. Monitor canary metrics
kubectl exec -it prometheus-0 -n $NAMESPACE -- \
  promtool query instant \
  'rate(http_requests_total{deployment="canary"}[5m])'

# 3. If metrics good, increase to 50%
kubectl scale deployment/api-deployment-canary --replicas=5 -n $NAMESPACE

# 4. Monitor for 10 minutes
sleep 600

# 5. If successful, switch all traffic
kubectl apply -f infrastructure/k8s/production/
kubectl delete -f infrastructure/k8s/canary/
```

## ✅ Post-Deployment Verification

### 1. Health Checks

```bash
# Check application health
curl https://api.openmeet.com/health
curl https://openmeet.com

# Expected response:
# {"status":"healthy","version":"1.2.3"}
```

### 2. Smoke Tests

```bash
# Run automated smoke tests
./infrastructure/scripts/smoke-test.sh production

# Manual verification
# 1. Login to application
# 2. Create a test meeting
# 3. Upload audio file
# 4. Verify transcription works
# 5. Check analytics dashboard
```

### 3. Performance Checks

```bash
# Check API response times (should be <200ms)
curl -w "@curl-format.txt" -o /dev/null -s https://api.openmeet.com/api/meetings

# Check database query performance
kubectl exec -it postgres-0 -n $NAMESPACE -- \
  psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis cache hit rate (should be >80%)
kubectl exec -it redis-0 -n $NAMESPACE -- \
  redis-cli INFO stats | grep keyspace_hits
```

### 4. Log Verification

```bash
# Check for errors in last 15 minutes
kubectl logs -n $NAMESPACE deployment/api-deployment --since=15m | grep -i error

# Check application startup
kubectl logs -n $NAMESPACE deployment/api-deployment --tail=50

# Verify no crash loops
kubectl get pods -n $NAMESPACE | grep -i crashloop
```

### 5. Metrics Verification

```bash
# Access Grafana dashboard
kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000

# Check key metrics:
# - Request rate
# - Error rate (<0.1%)
# - Response time (p95 <200ms)
# - CPU usage (<70%)
# - Memory usage (<80%)
```

## ⏮️ Rollback Procedures

### Emergency Rollback

```bash
# Immediate rollback to previous version
kubectl rollout undo deployment/api-deployment -n $NAMESPACE
kubectl rollout undo deployment/web-deployment -n $NAMESPACE

# Verify rollback
kubectl rollout status deployment/api-deployment -n $NAMESPACE
kubectl rollout status deployment/web-deployment -n $NAMESPACE

# Check application health
curl https://api.openmeet.com/health
```

### Database Rollback

```bash
# List available backups
aws s3 ls s3://openmeet-backups/postgres/ | tail -10

# Restore from specific backup
./infrastructure/scripts/backup/restore-database.sh \
  --from-s3 20240115_020000

# Verify restoration
kubectl exec -it postgres-0 -n $NAMESPACE -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### Full Environment Rollback

```bash
# Restore previous Kubernetes manifests
git checkout HEAD~1 infrastructure/k8s/production/

# Apply previous configuration
kubectl apply -f infrastructure/k8s/production/

# Restore database
./infrastructure/scripts/backup/restore-database.sh \
  --from-s3 TIMESTAMP

# Verify all services
./infrastructure/scripts/verify-deployment.sh
```

## 📊 Monitoring and Alerts

### Access Monitoring Tools

```bash
# Grafana
kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000
# Access: http://localhost:3000

# Prometheus
kubectl port-forward -n $NAMESPACE svc/prometheus 9090:9090
# Access: http://localhost:9090

# Kibana (Logs)
kubectl port-forward -n $NAMESPACE svc/kibana 5601:5601
# Access: http://localhost:5601
```

### Key Alerts to Monitor

1. **High Error Rate**: Error rate > 1% for 5 minutes
2. **High Latency**: P95 response time > 500ms for 5 minutes
3. **Pod Restarts**: More than 3 restarts in 10 minutes
4. **Database Connection Pool**: >80% utilization
5. **Disk Usage**: >85% on any volume
6. **Memory Pressure**: >90% memory usage

### Alert Channels

- **Critical**: PagerDuty + Slack #alerts-critical
- **Warning**: Slack #alerts-warning
- **Info**: Slack #deployments

## 🔧 Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n $NAMESPACE

# Describe pod for events
kubectl describe pod <pod-name> -n $NAMESPACE

# Check logs
kubectl logs <pod-name> -n $NAMESPACE --previous

# Common fixes:
# - Check image tag is correct
# - Verify secrets exist
# - Check resource limits
# - Verify node capacity
```

#### 2. Database Connection Errors

```bash
# Verify database is running
kubectl get pods -n $NAMESPACE | grep postgres

# Test database connectivity
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
kubectl exec -it postgres-0 -n $NAMESPACE -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Common fixes:
# - Verify DATABASE_URL is correct
# - Check max_connections setting
# - Restart database pod if needed
```

#### 3. High Memory Usage

```bash
# Check memory usage
kubectl top pods -n $NAMESPACE

# Get detailed metrics
kubectl describe node <node-name>

# Common fixes:
# - Increase memory limits
# - Scale horizontally
# - Check for memory leaks
# - Restart affected pods
```

#### 4. SSL Certificate Issues

```bash
# Check certificate expiry
kubectl get certificate -n $NAMESPACE

# Describe certificate
kubectl describe certificate openmeet-tls-cert -n $NAMESPACE

# Force renewal
kubectl delete certificate openmeet-tls-cert -n $NAMESPACE
kubectl apply -f infrastructure/k8s/production/ingress.yaml
```

### Emergency Contacts

- **On-Call Engineer**: PagerDuty escalation
- **DevOps Lead**: Slack @devops-lead
- **CTO**: +1-XXX-XXX-XXXX

### Incident Response

1. **Assess severity**: Critical / High / Medium / Low
2. **Create incident**: Slack /incident new
3. **Notify stakeholders**: Update status page
4. **Investigate**: Check logs, metrics, traces
5. **Mitigate**: Rollback or hot-fix
6. **Verify**: Run smoke tests
7. **Document**: Post-mortem within 48 hours

## 📚 Additional Resources

- [API Documentation](https://docs.openmeet.com)
- [Architecture Diagrams](https://github.com/company/openmeet/wiki/architecture)
- [Monitoring Dashboards](https://grafana.openmeet.com)
- [Status Page](https://status.openmeet.com)
- [Runbook Repository](https://github.com/company/openmeet/wiki/runbooks)

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
**Maintained By**: DevOps Team
