# Kubernetes Health Checks Configuration Guide

## Overview
This guide provides comprehensive health check configurations for all OpenMeet services to ensure high availability and automatic recovery.

## Health Check Types

### 1. Startup Probe
- **Purpose:** Determines when a container has successfully started
- **Effect:** Delays liveness and readiness probes until container is ready
- **Use Case:** Applications with slow initialization (database connections, cache warming)

### 2. Liveness Probe
- **Purpose:** Determines if a container is running properly
- **Effect:** Restarts the container if check fails
- **Use Case:** Detect deadlocks, infinite loops, or unrecoverable states

### 3. Readiness Probe
- **Purpose:** Determines if a container is ready to serve traffic
- **Effect:** Removes pod from service load balancer if check fails
- **Use Case:** Temporary issues (database connection lost, external dependency down)

## Best Practices

### Startup Probe Configuration
```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 3001
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30  # 150 seconds total
```

**Endpoint Requirements:**
- Returns 200 when application is fully initialized
- Checks:
  - Database connections established
  - Cache connections ready
  - Configuration loaded
  - Critical dependencies available

### Liveness Probe Configuration
```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3001
  initialDelaySeconds: 0  # Startup probe handles this
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3  # Restart after 30 seconds of failures
  successThreshold: 1
```

**Endpoint Requirements:**
- Fast response (< 1 second)
- Check only critical deadlock conditions
- **Do NOT check external dependencies** (use readiness for that)
- Should almost never fail unless application is truly broken

### Readiness Probe Configuration
```yaml
readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3001
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3  # Remove from LB after 15 seconds
  successThreshold: 1  # Add back after 1 success
```

**Endpoint Requirements:**
- Check all dependencies:
  - Database connectivity
  - Redis connectivity
  - Critical external APIs
- Can temporarily fail without restarting pod
- Fast recovery when dependencies restore

## Health Check Endpoints Implementation

### Node.js/Express Example
```typescript
// /health/startup - Startup probe
app.get('/health/startup', async (req, res) => {
  try {
    // Check if application is initialized
    if (!app.locals.initialized) {
      return res.status(503).json({ status: 'starting' });
    }

    // Check database connection pool
    await db.query('SELECT 1');

    // Check Redis connection
    await redis.ping();

    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      status: 'starting',
      error: error.message
    });
  }
});

// /health/liveness - Liveness probe
app.get('/health/liveness', (req, res) => {
  // Simple check - is the event loop responsive?
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// /health/readiness - Readiness probe
app.get('/health/readiness', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    elasticsearch: false
  };

  try {
    // Database check
    await db.query('SELECT 1');
    checks.database = true;

    // Redis check
    await redis.ping();
    checks.redis = true;

    // Elasticsearch check (optional)
    try {
      await elasticsearch.ping();
      checks.elasticsearch = true;
    } catch (e) {
      // Elasticsearch is optional
      checks.elasticsearch = true;
    }

    const allHealthy = Object.values(checks).every(check => check === true);

    if (allHealthy) {
      return res.status(200).json({
        status: 'ready',
        checks,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(503).json({
        status: 'not ready',
        checks,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return res.status(503).json({
      status: 'not ready',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## Service-Specific Configurations

### API Service
```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 3001
  periodSeconds: 5
  failureThreshold: 30  # 2.5 minutes
```

### Web Service (Next.js)
```yaml
startupProbe:
  httpGet:
    path: /api/health/startup
    port: 3000
  periodSeconds: 5
  failureThreshold: 60  # 5 minutes (Next.js build)
```

### Background Workers
```yaml
startupProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - "ps aux | grep -v grep | grep worker"
  periodSeconds: 5
  failureThreshold: 20
```

### PostgreSQL (Patroni)
Already configured in patroni-statefulset.yaml with Patroni's built-in health endpoints.

### Redis Sentinel
Already configured in redis-sentinel.yaml with Redis CLI ping checks.

## Troubleshooting

### Pod stuck in "CrashLoopBackOff"
**Cause:** Liveness probe failing repeatedly
**Solution:**
1. Check logs: `kubectl logs <pod-name>`
2. Increase `failureThreshold` temporarily
3. Check if startup is taking too long - add/adjust startup probe

### Pod not receiving traffic
**Cause:** Readiness probe failing
**Solution:**
1. Check dependencies: `kubectl exec <pod-name> -- curl http://postgres:5432`
2. Review readiness endpoint response
3. Check if external dependencies are down

### Slow rolling updates
**Cause:** Startup probe taking too long
**Solution:**
1. Optimize application startup time
2. Adjust `failureThreshold` and `periodSeconds`
3. Use async initialization for non-critical components

## Monitoring Health Checks

### Prometheus Metrics
```yaml
# Health check failures
sum(rate(kube_pod_container_status_restarts_total[5m])) by (pod)

# Pods not ready
count(kube_pod_status_phase{phase!="Running"}) by (namespace)
```

### Grafana Alerts
- Alert if pod restarts > 3 in 5 minutes
- Alert if readiness probe fails > 50% of time
- Alert if any pod stuck in non-running state > 5 minutes

## Auto-Healing Configuration

### Pod Disruption Budget
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: openmeet-api
```

### Resource Limits
Always set both requests and limits to prevent:
- OOM kills (memory)
- CPU throttling
- Resource contention

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

## Testing Health Checks

### Manual Testing
```bash
# Test startup probe
kubectl exec -it <pod-name> -- curl http://localhost:3001/health/startup

# Test liveness probe
kubectl exec -it <pod-name> -- curl http://localhost:3001/health/liveness

# Test readiness probe
kubectl exec -it <pod-name> -- curl http://localhost:3001/health/readiness

# Simulate failure
kubectl exec -it <pod-name> -- killall -9 node

# Watch pod recovery
kubectl get pods -w
```

### Chaos Testing
Use Chaos Mesh to test health check responses:
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: test-health-checks
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - openmeet-production
    labelSelectors:
      'app': 'openmeet-api'
  scheduler:
    cron: '@every 1h'
```

## Checklist

- [ ] All services have startup probes
- [ ] All services have liveness probes
- [ ] All services have readiness probes
- [ ] Health endpoints respond in < 1 second
- [ ] Liveness doesn't check external dependencies
- [ ] Readiness checks all critical dependencies
- [ ] Startup probe timeout > longest initialization time
- [ ] PodDisruptionBudgets configured for critical services
- [ ] Resource limits set on all containers
- [ ] Health check failures monitored in Grafana
