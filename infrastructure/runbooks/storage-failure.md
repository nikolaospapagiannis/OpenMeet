# Storage Failure Runbook

## Severity: HIGH
**RTO:** 10-15 minutes | **RPO:** Based on last backup

## Symptoms
- "No space left on device"
- Pod evictions
- PVC provisioning failures

## Automated Response
⚠️ Manual intervention required

## Manual Steps

### 1. Check Disk Usage
```bash
kubectl get nodes
kubectl describe nodes | grep -A 10 "Allocated resources"
df -h  # On each node
```

### 2. Immediate Cleanup
```bash
# Clean Docker cache
docker system prune -af --volumes

# Clean old logs
find /var/log -name "*.log" -mtime +7 -delete

# Clean old backups
find /var/backups/openmeet -mtime +30 -delete
```

### 3. Expand PVC
```bash
kubectl edit pvc postgres-pvc -n openmeet-production
# Increase storage: 100Gi -> 200Gi

# Verify expansion
kubectl get pvc -n openmeet-production -w
```

### 4. If Data Corruption - Restore
```bash
/home/user/openmeet/infrastructure/scripts/restore-postgres.sh \
  --timestamp $(date +%Y%m%d_%H%M%S) \
  --source s3
```

## Success Criteria
- [ ] Disk usage < 80%
- [ ] All PVCs bound
- [ ] No pod evictions
- [ ] Database intact
