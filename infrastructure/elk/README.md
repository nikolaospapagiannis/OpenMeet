# ELK Stack - Production Deployment Guide

Complete Fortune 100-grade ELK (Elasticsearch, Logstash, Kibana) stack with Filebeat for centralized logging.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Filebeat   │─────▶│  Logstash    │                    │
│  │  (DaemonSet) │      │ (Deployment) │                    │
│  └──────────────┘      └──────┬───────┘                    │
│         │                      │                             │
│         │                      ▼                             │
│         │              ┌──────────────┐                     │
│         └─────────────▶│Elasticsearch │                     │
│                        │(StatefulSet) │                     │
│                        │   3 Nodes    │                     │
│                        └──────┬───────┘                     │
│                               │                              │
│                               ▼                              │
│                        ┌──────────────┐                     │
│                        │    Kibana    │                     │
│                        │ (Deployment) │                     │
│                        └──────────────┘                     │
│                               │                              │
│                               ▼                              │
│                        ┌──────────────┐                     │
│                        │   Ingress    │                     │
│                        │  (HTTPS)     │                     │
│                        └──────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Production-Ready Components
- **Elasticsearch 3-node HA cluster** with persistent storage
- **Kibana** with authentication and SSL
- **Logstash** with multiple pipelines (API, Nginx, Audit)
- **Filebeat** DaemonSet for automatic log collection

### ✅ Advanced Features
- **Index Lifecycle Management (ILM)** - Hot/Warm/Cold/Delete phases
- **Index Templates** - Application, Access, Audit logs
- **Grok Patterns** - Custom log parsing
- **Kibana Dashboards** - Performance, Security, Audit, Infrastructure
- **Alerting** - Error rates, security events, performance
- **Backup & Restore** - Automated daily snapshots with S3 support

### ✅ Security
- Elasticsearch authentication
- Kibana SSL/TLS with cert-manager
- IP whitelisting on Ingress
- Optional basic auth
- Role-based access control (RBAC)

## Quick Start

### 1. Deploy ELK Stack

```bash
cd /home/user/openmeet/infrastructure/k8s/elk

# Deploy all components
chmod +x deploy-all.yaml
./deploy-all.yaml
```

### 2. Verify Deployment

```bash
# Check pods
kubectl get pods -n production -l component=elk

# Check services
kubectl get svc -n production -l component=elk

# Check Elasticsearch cluster health
kubectl exec -n production elasticsearch-0 -- curl -u elastic:changeme http://localhost:9200/_cluster/health?pretty
```

### 3. Access Kibana

```bash
# Get Kibana URL
kubectl get ingress kibana -n production

# Get password
kubectl get secret elasticsearch-credentials -n production -o jsonpath='{.data.password}' | base64 -d
```

Default credentials:
- **Username**: `elastic`
- **Password**: `changeme` (change in production!)

### 4. Setup Index Management

```bash
cd /home/user/openmeet/infrastructure/elk

# Apply ILM policies
cd index-lifecycle
./apply-ilm-policies.sh

# Apply index templates
cd ../index-templates
./apply-index-templates.sh
```

### 5. Import Dashboards

1. Open Kibana: `https://kibana.openmeet.com`
2. Navigate to: **Management** → **Saved Objects** → **Import**
3. Import dashboard files from: `/home/user/openmeet/infrastructure/elk/kibana/dashboards/`
   - `application-performance.ndjson`
   - `security-dashboard.ndjson`
   - `audit-dashboard.ndjson`
   - `infrastructure-dashboard.ndjson`

### 6. Configure Alerting

1. Setup connectors in Kibana:
   - **Management** → **Rules and Connectors** → **Connectors**
   - Create Slack connector
   - Create Email connector
   - Create PagerDuty connector (optional)

2. Import alert rules from: `/home/user/openmeet-v2/infrastructure/elk/kibana/alerts/`

### 7. Setup Backups

```bash
cd /home/user/openmeet/infrastructure/elk/backup

# Setup snapshot repository (filesystem)
./setup-snapshot-repository.sh

# Or for S3 backups, set environment variables:
export S3_BUCKET="your-bucket-name"
export S3_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
./setup-snapshot-repository.sh

# Deploy automated backup CronJob
kubectl apply -f backup-cronjob.yaml -n production

# Manual backup
./backup-script.sh

# Restore from backup
./restore-script.sh snapshot-20231115-020000
```

## Configuration

### Update Elasticsearch Password

```bash
# Update secret
kubectl create secret generic elasticsearch-credentials \
  --from-literal=username=elastic \
  --from-literal=password=YOUR_SECURE_PASSWORD \
  --dry-run=client -o yaml | kubectl apply -f - -n production

# Restart pods
kubectl rollout restart statefulset elasticsearch -n production
kubectl rollout restart deployment logstash kibana -n production
```

### Configure Application Logger

The application logger at `/home/user/openmeet/apps/api/src/utils/logger.ts` is already configured to:
- Output JSON format for ELK
- Add correlation IDs for request tracing
- Include Kubernetes metadata
- Ship logs to Logstash (when enabled)

Environment variables:
```bash
NODE_ENV=production
LOG_LEVEL=info
SERVICE_NAME=api
APP_VERSION=1.0.0
ENABLE_LOGSTASH=true
LOGSTASH_HOST=logstash
LOGSTASH_PORT=5000
```

### Scaling

```bash
# Scale Elasticsearch nodes
kubectl scale statefulset elasticsearch --replicas=5 -n production

# Scale Logstash
kubectl scale deployment logstash --replicas=3 -n production

# Scale Kibana
kubectl scale deployment kibana --replicas=3 -n production
```

## Monitoring

### Check Cluster Health

```bash
# Elasticsearch cluster health
kubectl exec -n production elasticsearch-0 -- \
  curl -u elastic:changeme http://localhost:9200/_cluster/health?pretty

# Node stats
kubectl exec -n production elasticsearch-0 -- \
  curl -u elastic:changeme http://localhost:9200/_nodes/stats?pretty

# Index stats
kubectl exec -n production elasticsearch-0 -- \
  curl -u elastic:changeme http://localhost:9200/_cat/indices?v
```

### Check Log Ingestion

```bash
# Check Filebeat logs
kubectl logs -f -n production -l app=filebeat --tail=100

# Check Logstash logs
kubectl logs -f -n production -l app=logstash --tail=100

# Query recent logs
kubectl exec -n production elasticsearch-0 -- \
  curl -u elastic:changeme -X GET "http://localhost:9200/logs-*/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{"size": 10, "sort": [{"@timestamp": "desc"}]}'
```

### Performance Metrics

Access metrics at:
- Elasticsearch: `http://elasticsearch:9200/_stats`
- Logstash: `http://logstash:9600/_node/stats`
- Kibana: `http://kibana:5601/api/status`

## Troubleshooting

### Elasticsearch won't start

```bash
# Check logs
kubectl logs -n production elasticsearch-0 -f

# Common issues:
# 1. Insufficient memory - increase limits in statefulset
# 2. vm.max_map_count too low - check init containers
# 3. Storage issues - check PVC status
kubectl get pvc -n production
```

### Logs not appearing in Kibana

```bash
# 1. Check Filebeat is running
kubectl get pods -n production -l app=filebeat

# 2. Check Logstash is receiving logs
kubectl logs -n production -l app=logstash --tail=100

# 3. Verify index exists
kubectl exec -n production elasticsearch-0 -- \
  curl -u elastic:changeme http://localhost:9200/_cat/indices?v

# 4. Create index pattern in Kibana
# Go to: Management → Index Patterns → Create
# Pattern: logs-*
```

### High disk usage

```bash
# Check index sizes
kubectl exec -n production elasticsearch-0 -- \
  curl -u elastic:changeme http://localhost:9200/_cat/indices?v&s=store.size:desc

# Force delete old indices
kubectl exec -n production elasticsearch-0 -- \
  curl -u elastic:changeme -X DELETE "http://localhost:9200/logs-api-2023.01.01"

# Apply ILM policies to automate cleanup
cd /home/user/openmeet/infrastructure/elk/index-lifecycle
./apply-ilm-policies.sh
```

## Index Lifecycle Management

### Phases

| Phase  | Duration | Actions                              |
|--------|----------|--------------------------------------|
| Hot    | 0-7 days | Active indexing, full search         |
| Warm   | 7-30 days| Read-only, force merge, shrink       |
| Cold   | 30-365 days| Minimal resources, frozen          |
| Delete | >365 days| Deleted                             |

### Audit Logs (Extended Retention)

| Phase  | Duration | Actions                              |
|--------|----------|--------------------------------------|
| Hot    | 0-7 days | Active indexing                      |
| Warm   | 7-90 days| Read-only, optimized                |
| Cold   | 90-2555 days (7 years)| Archived          |
| Delete | >7 years | Deleted                              |

## Security Best Practices

1. **Change default passwords** immediately
2. **Enable SSL/TLS** for all communications
3. **Configure IP whitelisting** on Ingress
4. **Use RBAC** for Kubernetes access
5. **Rotate credentials** regularly
6. **Enable audit logging** for compliance
7. **Backup encryption keys** securely
8. **Monitor security dashboards** daily

## Cost Optimization

1. **Use ILM policies** to move old data to cheaper storage
2. **Configure snapshot repository** to S3 for long-term retention
3. **Right-size nodes** based on actual usage
4. **Use node affinity** for cold data on cheaper nodes
5. **Compress snapshots** to reduce storage costs
6. **Delete unnecessary indices** regularly

## Support

For issues or questions:
- Check logs: `kubectl logs -n production <pod-name>`
- Elasticsearch docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
- Logstash docs: https://www.elastic.co/guide/en/logstash/current/index.html
- Kibana docs: https://www.elastic.co/guide/en/kibana/current/index.html

## License

Production deployment configuration for OpenMeet.
