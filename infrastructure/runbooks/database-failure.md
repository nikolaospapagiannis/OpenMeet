# Database Failure Runbook

## Severity: CRITICAL
**RTO:** 3-5 minutes | **RPO:** 0-30 seconds

## Automated Response
✅ Patroni automatically handles failover
✅ Incident response script alerts on-call team
✅ Health checks trigger Route53 failover if needed

## Manual Intervention Steps

### 1. Verify Cluster Status
```bash
kubectl exec -n openmeet-production postgres-patroni-0 -- patronictl list
```

### 2. Check Replication Lag
```bash
kubectl exec -n openmeet-production postgres-patroni-1 -- psql -U postgres -c \
  "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int AS lag_seconds;"
```

### 3. Force Failover (if needed)
```bash
kubectl exec -n openmeet-production postgres-patroni-1 -- \
  patronictl failover --candidate postgres-patroni-1 --force
```

### 4. Restore Failed Node
```bash
kubectl delete pod postgres-patroni-0 -n openmeet-production --force --grace-period=0
kubectl wait --for=condition=ready pod/postgres-patroni-0 -n openmeet-production --timeout=300s
```

## Success Criteria
- [ ] All 3 pods running
- [ ] 1 Leader elected
- [ ] Replication lag < 60 seconds
- [ ] Application queries successful
