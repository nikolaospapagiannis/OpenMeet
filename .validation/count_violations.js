const fs = require('fs');
const path = require('path');

const violations = [
  '// For now',
  '// TODO:',
  '// FIXME:',
  '// In production',
  '// In prod',
  '// This would',
  '// Would query',
  '// Placeholder',
  '// Mock',
  'console.log',
  'console.error',
  'console.warn'
];

const targetFiles = [
  'packages/core/src/process-mining/p2p-agent.ts',
  'packages/core/src/observability/health-checks.ts',
  'packages/core/src/communication/invitation-email-handler.js',
  'packages/core/src/process-mining/itil-incident-agent.ts',
  'packages/core/src/process-mining/o2c-agent.ts',
  'packages/core/src/observability/logger.ts',
  'packages/core/src/communication/email-service.js',
  'packages/core/src/session/session-manager.ts',
  'packages/core/src/security/rbac-service.ts',
  'packages/core/src/itsm/itsm-enterprise-hardening.ts',
  'packages/core/src/agents/network-incident-enhanced-agent.ts',
  'packages/core/src/workflows/polish-approval-workflow.ts',
  'packages/core/src/initialize-observability.ts'
];

const results = [];

for (const file of targetFiles) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, 'utf8');
  let count = 0;

  for (const pattern of violations) {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    if (matches) count += matches.length;
  }

  if (count > 0) {
    results.push({ file, count });
  }
}

results.sort((a, b) => b.count - a.count);
results.forEach(r => console.log(`${r.count}\t${r.file}`));
