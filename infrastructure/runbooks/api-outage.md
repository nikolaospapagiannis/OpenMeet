# API Outage Runbook

## Severity: HIGH
**RTO:** 2-3 minutes | **RPO:** N/A (stateless)

## Automated Response
✅ Kubernetes restarts failed pods
✅ Load balancer removes unhealthy pods
✅ Horizontal Pod Autoscaler scales up if needed

## Manual Intervention Steps

### 1. Check Pod Status
```bash
kubectl get pods -n openmeet-production -l app=api
kubectl describe pod <failing-pod> -n openmeet-production
```

### 2. Check Logs
```bash
kubectl logs -n openmeet-production -l app=api --tail=100
kubectl logs -n openmeet-production <pod-name> --previous  # If pod restarted
```

### 3. Restart Failed Pods
```bash
kubectl delete pod -n openmeet-production -l app=api --field-selector=status.phase!=Running
```

### 4. Scale Up Temporarily
```bash
kubectl scale deployment api -n openmeet-production --replicas=5
```

### 5. Check Dependencies
```bash
# Database connectivity
kubectl exec -n openmeet-production <api-pod> -- psql -h postgres-master -U postgres -c "SELECT 1"

# Redis connectivity
kubectl exec -n openmeet-production <api-pod> -- redis-cli -h redis-master ping
```

## Root Cause Checklist
- [ ] Database connection pool exhausted?
- [ ] Memory leak / OOM killed?
- [ ] External API timeout?
- [ ] CPU throttling?
- [ ] Network partition?

## Success Criteria
- [ ] All API pods healthy
- [ ] Health check returns 200
- [ ] Response time < 200ms
- [ ] Error rate < 0.1%
