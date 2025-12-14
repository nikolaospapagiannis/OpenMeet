/**
 * Map Usage Auditor - Zero Tolerance Enforcement
 *
 * Classifies Map usage as:
 * - LEGITIMATE: Agent state, workflow state, in-flight operations
 * - CACHE_VIOLATION: Cache that should be Redis
 * - STATE_VIOLATION: State that should be PostgreSQL
 */

const fs = require('fs');
const path = require('path');

const files = [
  'packages/core/src/agent.ts',
  'packages/core/src/agents/enterprise-business-rules-engine.ts',
  'packages/core/src/agents/enterprise-notification-agent.ts',
  'packages/core/src/agents/fleet-management-agent.ts',
  'packages/core/src/agents/network-diagnostics-enterprise.ts',
  'packages/core/src/agents/network-incident-agent.ts',
  'packages/core/src/agents/polish-itsm-triage-agent.ts',
  'packages/core/src/agents/polish-itsm-triage-agent-enterprise.ts',
  'packages/core/src/analytics/process-anomaly-detector.ts',
  'packages/core/src/apm/alarm-correlation-engine.ts',
  'packages/core/src/apm/apm-integration-enterprise.ts',
  'packages/core/src/autonomous-agent-orchestrator.ts',
  'packages/core/src/checkpoint-manager.ts',
  'packages/core/src/communication/email-service.ts',
  'packages/core/src/compliance/compliance-engine.ts',
  'packages/core/src/contracts.ts',
  'packages/core/src/database/oracle-jdbc-pool.ts',
  'packages/core/src/decomposition.ts',
  'packages/core/src/deployment/zero-downtime-deployment.ts',
  'packages/core/src/disaster-recovery/disaster-recovery-engine.ts',
  'packages/core/src/documentation/enterprise-documentation.ts',
  'packages/core/src/editor/auto-save-service.ts',
  'packages/core/src/enhancement/adaptive-ui-detector.ts',
  'packages/core/src/enhancement/coverage-intelligence-analyzer.ts',
  'packages/core/src/enhancement/error-recovery-suggestions.ts',
  'packages/core/src/enhancement/task-chain-orchestrator.ts',
  'packages/core/src/execution/parallel-executor.ts',
  'packages/core/src/execution/progress-tracker.ts',
  'packages/core/src/execution/resource-scheduler.ts',
  'packages/core/src/export/process-mining-exporter.ts',
  'packages/core/src/financial/advanced-cost-attribution.ts',
  'packages/core/src/financial/tco-roi-calculator.ts',
  'packages/core/src/index.ts',
  'packages/core/src/integrations/repository-context-llm-integration.ts',
  'packages/core/src/itsm/change-calendar-correlator.ts',
  'packages/core/src/itsm/itsm-enterprise-hardening.ts',
  'packages/core/src/locking/redlock-service.ts',
  'packages/core/src/memory/advanced-pruning.ts',
  'packages/core/src/message-bus.ts',
  'packages/core/src/message-bus-bullmq.ts',
  'packages/core/src/ml/embedding-service-enterprise.ts',
  'packages/core/src/ml/mlops-model-registry.ts',
  'packages/core/src/ml/model-ab-testing.ts',
  'packages/core/src/ml/model-drift-detector.ts',
  'packages/core/src/ml/predictive-process-analytics.ts',
  'packages/core/src/monitoring/enterprise-alerting-service.ts',
  'packages/core/src/multi-agent-orchestrator.ts',
  'packages/core/src/notifications/redis-pubsub-service.ts',
  'packages/core/src/observability.ts',
  'packages/core/src/observability/apm-integration.ts',
  'packages/core/src/observability/apm-integration-enterprise.ts',
  'packages/core/src/observability/enterprise-observability.ts',
  'packages/core/src/observability/enterprise-observability-real.ts',
  'packages/core/src/observability/health-checks.ts',
  'packages/core/src/observability/index.ts',
  'packages/core/src/observability/metrics-collector.ts',
  'packages/core/src/observability/metrics-server.ts',
  'packages/core/src/observability/real-time-workflow-tracker.ts',
  'packages/core/src/observability/sla-tracker.ts',
  'packages/core/src/planning/multi-step-planner.ts',
  'packages/core/src/process-mining/erp-adapter-layer.ts',
  'packages/core/src/process-mining/fraud-detection-engine.ts',
  'packages/core/src/process-mining/itil-incident-agent.ts',
  'packages/core/src/process-mining/o2c-agent.ts',
  'packages/core/src/process-mining/o2c-kpi-calculator.ts',
  'packages/core/src/process-mining/ocpm-discovery-engine.ts',
  'packages/core/src/process-mining/optimization-playbook-library.ts',
  'packages/core/src/process-mining/p2p-agent.ts',
  'packages/core/src/process-mining/process-mining-load-test.ts',
  'packages/core/src/process-mining/whatif-simulation-engine.ts',
  'packages/core/src/providers/fallback-chain.ts',
  'packages/core/src/providers/provider-auto-selector.ts',
  'packages/core/src/providers/provider-factory.ts',
  'packages/core/src/providers/real-provider-integration.ts',
  'packages/core/src/quality/founderx-quality-enforcement.ts',
  'packages/core/src/queues/job-queue-manager.ts',
  'packages/core/src/reasoning/react.ts',
  'packages/core/src/reasoning/tree-of-thought.ts',
  'packages/core/src/recovery/auto-fix-generator.ts',
  'packages/core/src/recovery/build-error-analyzer.ts',
  'packages/core/src/recovery/confidence-scoring.ts',
  'packages/core/src/recovery/file-system-abstraction.ts',
  'packages/core/src/recovery/runtime-error-diagnostics.ts',
  'packages/core/src/resilience/circuit-breaker.ts',
  'packages/core/src/resilience/enterprise-circuit-breaker.ts',
  'packages/core/src/scalability/connection-pool-optimizer.ts',
  'packages/core/src/scalability/database-connection-pool.ts',
  'packages/core/src/scalability/database-sharding-service.ts',
  'packages/core/src/scalability/load-balancer.ts',
  'packages/core/src/scalability/orchestrator-admin-service.ts',
  'packages/core/src/scalability/redis-cluster.ts',
  'packages/core/src/scalability/redis-cluster-real.ts',
  'packages/core/src/scalability/scalability-engine.ts',
  'packages/core/src/security/auth-service.ts',
  'packages/core/src/security/compliance-documentation-generator.ts',
  'packages/core/src/security/ddos-protection-middleware.ts',
  'packages/core/src/security/distributed-rate-limiter.ts',
  'packages/core/src/security/encryption-at-rest-service.ts',
  'packages/core/src/security/encryption-service.ts',
  'packages/core/src/security/enterprise-secret-manager.ts',
  'packages/core/src/security/enterprise-secrets-manager.ts',
  'packages/core/src/security/fraud-detection-service.ts',
  'packages/core/src/security/jwt-auth.ts',
  'packages/core/src/security/kms-key-manager.ts',
  'packages/core/src/security/mtls-service.ts',
  'packages/core/src/security/rbac-service.ts',
  'packages/core/src/security/secret-manager-kms.ts',
  'packages/core/src/security/secret-manager-production.ts',
  'packages/core/src/security/secrets-manager.ts',
  'packages/core/src/security/secrets-manager-enterprise.ts',
  'packages/core/src/security/secrets-rotation-service.ts',
  'packages/core/src/security/security-audit.ts',
  'packages/core/src/security/sod-violation-detector.ts',
  'packages/core/src/security/sox-compliant-audit-service.ts',
  'packages/core/src/security/vault-secrets-manager.ts',
  'packages/core/src/services/blueprint-comparison-service.ts',
  'packages/core/src/session/delta-checkpoint-manager.ts',
  'packages/core/src/session/file-checkpoint-storage.ts',
  'packages/core/src/session/session-manager.ts',
  'packages/core/src/system-integrator.ts',
  'packages/core/src/terminal/pty-service.ts',
  'packages/core/src/testing/chaos-engineering-framework.ts',
  'packages/core/src/workers/background-job-worker.ts',
  'packages/core/src/workflow/dag-workflow-engine.ts',
  'packages/core/src/workflows/enterprise-approval-workflow.ts',
  'packages/core/src/workflows/process-discovery-engine.ts',
  'packages/core/src/workflows/workflow-executor.ts',
  'packages/core/src/workflows/workflow-recovery.ts'
];

// Classification heuristics
const LEGITIMATE_PATTERNS = [
  /agents?: Map/i,           // Agent instance management
  /workflow.*Map/i,          // Workflow state
  /session.*Map/i,           // Session state
  /pending.*Map/i,           // In-flight operations
  /active.*Map/i,            // Active operations
  /inFlight.*Map/i,          // In-flight tracking
  /subscribers?.*Map/i,      // PubSub subscribers
  /listeners?.*Map/i,        // Event listeners
  /handlers?.*Map/i,         // Event handlers
  /connections?.*Map/i,      // Active connections
  /sockets?.*Map/i,          // WebSocket connections
  /workers?.*Map/i,          // Worker pool
  /executors?.*Map/i,        // Execution context
];

const CACHE_PATTERNS = [
  /cache.*Map/i,
  /cached.*Map/i,
  /metrics?.*Map/i,
  /counter.*Map/i,
  /stats?.*Map/i,
  /histor(y|ies).*Map/i,
  /results?.*Map/i,
  /responses?.*Map/i,
  /data.*Map/i,
];

const STATE_PATTERNS = [
  /users?.*Map/i,
  /tokens?.*Map/i,
  /keys?.*Map/i,
  /secrets?.*Map/i,
  /credentials?.*Map/i,
];

function classifyMap(varName, file) {
  for (const pattern of LEGITIMATE_PATTERNS) {
    if (pattern.test(varName)) {
      return { type: 'LEGITIMATE', reason: `Matches pattern: ${pattern}` };
    }
  }

  for (const pattern of CACHE_PATTERNS) {
    if (pattern.test(varName)) {
      return { type: 'CACHE_VIOLATION', reason: `Cache should be Redis: ${pattern}` };
    }
  }

  for (const pattern of STATE_PATTERNS) {
    if (pattern.test(varName)) {
      return { type: 'STATE_VIOLATION', reason: `State should be PostgreSQL: ${pattern}` };
    }
  }

  // Default: assume cache violation if uncertain
  return { type: 'UNCERTAIN', reason: 'Needs manual review' };
}

function analyzeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { file: filePath, error: 'File not found', maps: [] };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const maps = [];
    const mapRegex = /(private|public|protected)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*new\s+Map</g;

    lines.forEach((line, idx) => {
      let match;
      while ((match = mapRegex.exec(line)) !== null) {
        const varName = match[2];
        const classification = classifyMap(varName, filePath);
        maps.push({
          line: idx + 1,
          varName,
          code: line.trim(),
          ...classification
        });
      }
    });

    return { file: filePath, maps };
  } catch (error) {
    return { file: filePath, error: error.message, maps: [] };
  }
}

// Analyze all files
const results = files.map(analyzeFile);

// Calculate statistics
const stats = {
  totalFiles: results.length,
  filesWithMaps: results.filter(r => r.maps && r.maps.length > 0).length,
  totalMaps: results.reduce((sum, r) => sum + (r.maps ? r.maps.length : 0), 0),
  legitimate: 0,
  cacheViolations: 0,
  stateViolations: 0,
  uncertain: 0
};

results.forEach(r => {
  if (r.maps) {
    r.maps.forEach(m => {
      if (m.type === 'LEGITIMATE') stats.legitimate++;
      else if (m.type === 'CACHE_VIOLATION') stats.cacheViolations++;
      else if (m.type === 'STATE_VIOLATION') stats.stateViolations++;
      else stats.uncertain++;
    });
  }
});

// Output results
console.log('\n=== MAP USAGE AUDIT ===\n');
console.log(`Total files analyzed: ${stats.totalFiles}`);
console.log(`Files with Maps: ${stats.filesWithMaps}`);
console.log(`Total Map instances: ${stats.totalMaps}`);
console.log(`\n--- Classification ---`);
console.log(`✅ LEGITIMATE (in-memory state): ${stats.legitimate}`);
console.log(`❌ CACHE_VIOLATION (should be Redis): ${stats.cacheViolations}`);
console.log(`❌ STATE_VIOLATION (should be PostgreSQL): ${stats.stateViolations}`);
console.log(`⚠️  UNCERTAIN (needs manual review): ${stats.uncertain}`);
console.log(`\n--- TOTAL VIOLATIONS ---`);
console.log(`${stats.cacheViolations + stats.stateViolations} Maps must be eliminated`);

// Write detailed report
const report = {
  stats,
  violations: results
    .map(r => ({
      file: r.file,
      maps: r.maps ? r.maps.filter(m => m.type !== 'LEGITIMATE') : []
    }))
    .filter(r => r.maps.length > 0)
};

fs.writeFileSync(
  'map-audit-report.json',
  JSON.stringify(report, null, 2)
);

console.log('\nDetailed report written to: map-audit-report.json');

// Print top violators
console.log('\n=== TOP 10 FILES WITH VIOLATIONS ===\n');
const violators = results
  .map(r => ({
    file: path.basename(r.file),
    violations: r.maps ? r.maps.filter(m => m.type !== 'LEGITIMATE').length : 0
  }))
  .filter(v => v.violations > 0)
  .sort((a, b) => b.violations - a.violations)
  .slice(0, 10);

violators.forEach((v, idx) => {
  console.log(`${idx + 1}. ${v.file}: ${v.violations} violations`);
});
