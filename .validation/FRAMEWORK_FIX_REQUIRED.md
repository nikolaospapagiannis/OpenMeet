# VIOLATION FRAMEWORK FIX REQUIRED

## Critical Gaps Identified

The violation-prevention-framework.js has patterns that are TOO RESTRICTIVE and missing violations.

### Problem: Patterns Require Exact Start of Comment

```javascript
// BROKEN PATTERNS (miss violations):
/\/\/ TODO:/gi,           // Misses: "// Fix this TODO: implement later"
/\/\/ In production/gi,   // Misses: "// Mock - in production would query DB"
/\/\/ would query/gi,     // Misses: "// Temp - would query real service"
/\/\/ Mock data/gi,       // Misses: "// Returns mock data for testing"
```

### Fix: Make Patterns Match Anywhere in Comment

```javascript
// FIXED PATTERNS (catch all violations):
/\bTODO:/gi,              // Matches TODO: anywhere
/\bin production\b/gi,    // Matches "in production" anywhere
/\bwould query\b/gi,      // Matches "would query" anywhere
/\bmock\s+data\b/gi,      // Matches "mock data" anywhere
/\bmock\s+implementation\b/gi, // Add this!
/\bmock.*incidents?\b/gi, // Add this!
/\bwould\s+(query|fetch|connect|send|execute)/gi, // Broader pattern
```

### Verified Misses

Files with violations that framework MISSED:

1. `packages/core/src/agents/network-incident-enhanced-agent.ts:809`
   ```typescript
   // Mock historical incidents - in production would query incident database
   ```
   - Should match: "mock", "in production", "would query"
   - Actually matched: NONE (all require "//" at start)

2. `packages/core/src/workflows/polish-approval-workflow.ts:123`
   ```typescript
   // Mock implementation - integrate with real LDAP service
   ```
   - Should match: "mock implementation"
   - Actually matched: NONE (pattern is "// Mock data" specifically)

### Recommended Fix

Edit `.validation/violation-prevention-framework.js`:

```javascript
stubs: [
    // Remove "//" prefix, use word boundaries instead
    /\bTODO:/gi,
    /\bFIXME:/gi,
    /\bSTUB:/gi,
    /\bPLACEHOLDER:/gi,
    /\bNOT\s+IMPLEMENTED\b/gi,
    /\bIn\s+a\s+real\s+implementation\b/gi,
    /\bIn\s+production\b/gi,
    /\bIn\s+prod\b/gi,
    /\bFor\s+now\b/gi,
    /\bwould\s+(fetch|query|send|connect|execute|analyze|start|gather|insert)/gi, // Consolidated
    /throw new Error\(['"`]Not implemented['"`]\)/gi,
    /return null;\s*\/\/\s*stub/gi,
    /return\s*\{\};\s*\/\/\s*stub/gi,
    /return\s*\[\];\s*\/\/\s*stub/gi,
],

mocks: [
    /\bmock\s+(data|implementation|response|service|incidents?)\b/gi, // Broader
    /\bTemporary\s+mock\b/gi,
    /\/\*\s*mock\s*\*\//gi,
    /\bmockData\s*=/gi,
    /\bmock\w+Service\b/gi,
    /\bfake\w+Data\b/gi,
    /\bdummyData\b/gi,
    /\btemporaryData\b/gi,
    /\bsampleData\b/gi,
],
```

### Testing

Before deploying fixes:

```bash
# Test pattern matching
node -e "
const text = '// Mock historical incidents - in production would query incident database';
const patterns = {
  old_mock: /\/\/ Mock data/gi,
  new_mock: /\bmock\s+(data|implementation|incidents?)\b/gi,
  old_prod: /\/\/ In production/gi,
  new_prod: /\bin production\b/gi,
  old_would: /\/\/ would query/gi,
  new_would: /\bwould query\b/gi,
};

Object.entries(patterns).forEach(([name, pattern]) => {
  const match = text.match(pattern);
  console.log(\`\${name}: \${match ? 'MATCH ✓' : 'NO MATCH ✗'}\`);
});
"

# Expected output:
# old_mock: NO MATCH ✗
# new_mock: MATCH ✓
# old_prod: NO MATCH ✗
# new_prod: MATCH ✓
# old_would: NO MATCH ✗
# new_would: MATCH ✓
```

### Impact

After fixing patterns:
- **Current:** 0 violations detected (FALSE NEGATIVE)
- **After Fix:** ~20-50 violations expected (TRUE POSITIVES)

### Action Required

1. Update `.validation/violation-prevention-framework.js` with fixed patterns
2. Run `node .validation/run-violation-detector.js`
3. Expect to find ~20-50 real violations
4. Fix all detected violations
5. Re-run until 0 violations
6. Verify with comprehensive audit
7. Update pre-commit hooks if needed

---

**Created:** 2025-11-08
**Priority:** CRITICAL
**Blocked:** Production deployment until fixed
