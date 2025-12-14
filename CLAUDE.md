# CLAUDE.md — Universal Zero-Tolerance Implementation Standards v3.1

> **THE ONE RULE**: If you can't prove it works RIGHT NOW with a single command, it doesn't exist.

> **THE AI RULE**: If your "AI feature" doesn't call an actual model, it's a decorated if/else.

> **THE DISTRIBUTED RULE**: If it doesn't survive node failure, it's not distributed. ⭐ NEW

---

## 📑 TABLE OF CONTENTS

1. [Absolute Prohibitions](#-section-1-absolute-prohibitions)
2. [Truth Protocol — Deception Detection](#-section-2-truth-protocol--deception-detection)
3. [Mandatory Verification Protocol](#-section-3-mandatory-verification-protocol)
4. [Required Evidence Format](#-section-4-required-evidence-format)
5. [Fortune 100 Compliance Gate](#-section-5-fortune-100-compliance-gate)
6. [AI/LLM Integration Standards](#-section-6-aillm-integration-standards)
7. [Workflow & Orchestration Standards](#-section-7-workflow--orchestration-standards)
8. [Queue & Messaging Standards](#-section-8-queue--messaging-standards)
9. [Distributed Systems Standards](#-section-9-distributed-systems-standards)
10. [Logging & Observability Standards](#-section-10-logging--observability-standards)
11. [Vector Memory & Context Persistence](#-section-11-vector-memory--context-persistence) ⭐ NEW
12. [AI Hallucination Prevention & Drift Detection](#-section-12-ai-hallucination-prevention--drift-detection) ⭐ NEW
13. [Pre-commit Hooks & Git Flow Enforcement](#-section-13-pre-commit-hooks--git-flow-enforcement) ⭐ NEW
14. [Architecture Anti-Patterns](#-section-14-architecture-anti-patterns)
15. [Database & Storage Standards](#-section-15-database--storage-standards)
16. [API Design Standards](#-section-16-api-design-standards)
17. [Testing Standards](#-section-17-testing-standards)
18. [Performance Standards](#-section-18-performance-standards)
19. [Enforcement Commands](#-section-19-enforcement-commands)
20. [Recovery Protocol](#-section-20-recovery-protocol)
21. [Project Configuration](#-section-21-project-configuration)
22. [The Ultimate Standard](#-section-22-the-ultimate-standard)

---

## ⛔ SECTION 1: ABSOLUTE PROHIBITIONS

### Tier 1: INSTANT REJECTION (Fraudulent Patterns)

These patterns are **never acceptable** under any circumstances:

| Pattern | Why It's Fraud | Detection |
|---------|----------------|-----------|
| `Map<>` / `{}` / `[]` as "database" | Data vanishes on restart | Any in-memory collection storing persistent data |
| `console.log()` as "monitoring" | No persistence, alerts, or dashboards | Logging without metrics service integration |
| `setTimeout`/`setInterval` as "queue" | No retry, persistence, or scaling | Async delays pretending to be job queues |
| `Math.random()` for IDs/logic | Non-deterministic, no guarantees | Random values in business logic |
| `throw new Error('Not implemented')` | Interface ≠ Implementation | Empty method bodies with throws |
| `// TODO` / `// FIXME` / `// HACK` | Admitted incompleteness | Any TODO-style comments |
| `return { mock: true }` | Literal fake data | Hardcoded response objects |
| `"hardcoded-key"` / `"test-123"` | Security violation + fake | String literals for secrets/IDs |
| `async fn() { return staticValue }` | Fake async, no real operation | Async functions with no await |
| `Base64.encode()` as "encryption" | Encoding ≠ Encryption | Base64 for "security" |
| `if/else` as "AI-powered" | Rules ≠ Intelligence | Conditionals claiming to be AI |
| `setInterval` as "real-time" | Polling ≠ Real-time | Intervals claiming to be WebSocket/SSE |
| `regex` as "security scanning" | Pattern matching ≠ Analysis | Regex claiming to be security |
| `counter++` as "rate limiting" | Memory counter ≠ Distributed limiting | In-memory counters for rate limits |
| `Promise.all` as "parallel processing" | Single-threaded ≠ Parallelism | JS async claiming CPU parallelism |
| `JSON.stringify` as "serialization" | No schema validation | Untyped serialization |
| `try/catch` as "error handling" | Catching ≠ Handling | Empty catch blocks |
| `sleep(1000)` as "backoff" | Fixed delay ≠ Exponential backoff | Non-exponential retry delays |
| `process.env` as "config management" | No validation, typing, or defaults | Raw env access without validation |
| `new Date()` as "timestamp" | No timezone handling | Date without UTC specification |
| `for loop` as "workflow orchestration" | No state persistence or recovery | Sequential code claiming to be workflow |
| `Promise.all` as "parallel workflow" | No failure handling per task | Parallel promises as workflow |
| `mutex` in memory as "distributed lock" | Single-node only | In-memory lock claiming distributed |
| `setInterval` as "scheduler" | No persistence, no cluster-aware | Intervals claiming to be cron |
| `Array.push` as "event queue" | In-memory, lost on restart | Array as message queue |
| `EventEmitter` as "message broker" | Single-process, no persistence | Node events as messaging |
| `console.log` as "structured logging" | No levels, no persistence, no format | Console as production logging |
| `fs.appendFile` as "audit log" | No rotation, no integrity | File append as audit trail |

### Tier 1.6: FAKE CODE PATTERNS ⭐ NEW

| Pattern | Why It's Fraud | Detection |
|---------|----------------|-----------|
| `async fn() { return value }` | No await = sync pretending async | Async without await keyword |
| `return {}` / `return []` / `return null` | Empty return = no implementation | Return statements with empty values |
| `return { success: true }` | Hardcoded success = no logic | Static object returns |
| `return mockData` / `return fakeData` | Literal fake naming | Variables named mock/fake/dummy/stub |
| `// TODO: implement` | Admitted non-implementation | TODO/FIXME/HACK/XXX comments |
| `// In production...` | Fake excuse comment | Comments excusing fake code |
| `// For now we...` | Temporary fake excuse | Comments admitting shortcuts |
| `// This should be connected to...` | Unimplemented integration | Comments describing missing connections |
| `// Placeholder for...` | Literal placeholder admission | Placeholder comments |
| `// Stub implementation` | Admitted stub | Stub/mock comments |
| `// Will be replaced with...` | Future-fake pattern | Comments promising future work |
| `// Simulated...` / `// Mocked...` | Admitted simulation | Simulation/mock comments |
| `throw new Error('Not implemented')` | Non-implementation as implementation | NotImplemented errors |
| `return Promise.resolve(x)` | Fake async wrapping sync | Promise.resolve on static value |
| `await sleep(n)` then return static | Fake processing time | Artificial delays before static return |
| `if (process.env.NODE_ENV === 'test')` | Test-only fake paths | Environment-conditional fakes |

### Forbidden Comment Patterns (Regex Detection)

```typescript
// 🚫 FORBIDDEN PATTERNS - Block in pre-commit hook

const FORBIDDEN_COMMENT_PATTERNS = [
  /\/\/\s*TODO/i,
  /\/\/\s*FIXME/i,
  /\/\/\s*HACK/i,
  /\/\/\s*XXX/i,
  /\/\/\s*WIP/i,
  /\/\/\s*TEMP/i,
  /\/\/\s*in\s+production/i,
  /\/\/\s*for\s+now/i,
  /\/\/\s*placeholder/i,
  /\/\/\s*stub/i,
  /\/\/\s*mock/i,
  /\/\/\s*fake/i,
  /\/\/\s*dummy/i,
  /\/\/\s*simulated?/i,
  /\/\/\s*this\s+should\s+be/i,
  /\/\/\s*will\s+be\s+replaced/i,
  /\/\/\s*needs?\s+to\s+be\s+(connected|implemented|integrated)/i,
  /\/\/\s*not\s+implemented/i,
  /\/\/\s*implement\s+later/i,
  /\/\/\s*skip(ped)?\s+for\s+now/i,
  /\/\/\s*temporary/i,
  /\/\/\s*remove\s+(this|before|in\s+prod)/i,
  /\/\*\s*eslint-disable/,  // Disabling linting = hiding problems
  /\/\/\s*@ts-ignore/,      // Ignoring TypeScript = hiding type errors
  /\/\/\s*@ts-expect-error(?!\s+-)/,  // Without explanation = hiding errors
];

// 🚫 FORBIDDEN VARIABLE/FUNCTION NAMES
const FORBIDDEN_NAMES = [
  /mock[A-Z_]/i,
  /fake[A-Z_]/i,
  /dummy[A-Z_]/i,
  /stub[A-Z_]/i,
  /temp[A-Z_]/i,
  /placeholder[A-Z_]/i,
  /sample[A-Z_]/i,
  /example[A-Z_]/i,
  /test[A-Z_](?!ing)/i,  // testData, not testing
];
```

### Tier 1.5: AI-SPECIFIC FRAUDS ⭐ NEW

| Pattern | Why It's Fraud | Detection |
|---------|----------------|-----------|
| `if (input.includes('hello'))` as "NLP" | String matching ≠ Understanding | Keyword detection claiming to be NLP |
| `responses[Math.random()]` as "AI" | Random selection ≠ Intelligence | Randomized responses claiming AI |
| `switch(intent)` as "intent detection" | Hardcoded ≠ Learned | Switch statements on user input |
| `templates[category]` as "generation" | Templates ≠ Generation | Template filling claiming to be generative |
| `embedding = [0,0,0...]` as "vectors" | Fake vectors | Zero or random embeddings |
| `similarity > 0.5` as "semantic search" | Threshold ≠ Search | Arbitrary thresholds without real similarity |
| `await delay(500)` as "thinking" | Delay ≠ Processing | Artificial delays to simulate AI |
| `JSON.parse(staticResponse)` | Static ≠ Dynamic | Hardcoded JSON claiming to be AI response |
| `model: 'gpt-4'` without API call | Config ≠ Integration | Model name in config without actual calls |
| `// AI processes this` | Comment ≠ Implementation | Comments describing non-existent AI |

### Tier 2: REQUIRES JUSTIFICATION

These require explicit explanation and are suspicious by default:

| Pattern | Acceptable When | Red Flag When |
|---------|-----------------|---------------|
| In-memory cache | Explicitly temporary, with TTL documented | Called "production caching" |
| Simplified algorithm | Documented as MVP with ticket reference | Called "enterprise-grade" |
| Single retry | Network calls with documented backoff | Called "resilient" |
| Basic validation | Input sanitization, scope documented | Called "comprehensive security" |
| Local file storage | Development only, explicitly temporary | Called "persistent storage" |
| Single-node deployment | Dev/staging with documented limitation | Called "scalable" |
| Synchronous processing | Low-volume with documented threshold | Called "high-performance" |
| Basic auth | Internal tools with network isolation | Called "secure authentication" |
| Self-signed certs | Local development only | Called "TLS secured" |
| SQLite | Dev/testing or read-heavy embedded | Called "production database" |

### Tier 3: FORBIDDEN PHRASES

Never use these phrases — they signal unverified claims:

```
❌ "This should work..."           → Didn't test it
❌ "The implementation is complete" → Without test output
❌ "I've created the files..."     → Files ≠ Working code
❌ "The error proves it's working" → Errors prove it's broken
❌ "You just need to set up..."    → I didn't verify it
❌ "It's integrated with..."       → Without showing integration
❌ "Production ready"              → Without production evidence
❌ "Enterprise grade"              → Marketing, not engineering
❌ "Fortune 100 ready"             → Without passing Fortune 100 checklist
❌ "Comprehensive"                 → Without defining scope
❌ "Robust"                        → Meaningless buzzword
❌ "Scalable"                      → Without load test results
❌ "Secure"                        → Without security audit
❌ "Real-time"                     → Without WebSocket/SSE proof
❌ "AI-powered"                    → Without actual model integration
❌ "Distributed"                   → Without multi-node proof
❌ "Encrypted"                     → Without specifying algorithm
❌ "Compliant"                     → Without specifying standard
❌ "Intelligent"                   → Without ML model proof
❌ "Smart"                         → Without defining intelligence
❌ "Autonomous"                    → Without agent architecture proof
❌ "Self-healing"                  → Without recovery mechanism proof
❌ "Zero-downtime"                 → Without deployment strategy proof
❌ "Infinitely scalable"           → Nothing is infinite
❌ "Blazingly fast"                → Without benchmarks
❌ "Battle-tested"                 → Without production traffic proof
❌ "Industry-leading"              → Without comparison data
❌ "Best-in-class"                 → Marketing nonsense
```

---

## 🔍 SECTION 2: TRUTH PROTOCOL — DECEPTION DETECTION

### The Fake → Reality Mapping

When you write code or review implementations, check against this table:

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "Real-time monitoring" | Prometheus/DataDog/CloudWatch integration | Uses `console.log` |
| "AI-powered analysis" | Actual LLM API calls with responses | Uses `if/else` or hardcoded responses |
| "Encrypted storage" | AES-256/RSA with key management | Uses Base64 encoding |
| "Distributed processing" | Multiple nodes with coordination | Runs in single thread |
| "Enterprise authentication" | OAuth2/SAML/OIDC with MFA | Uses basic auth or API keys only |
| "Comprehensive logging" | Persistent storage with rotation | Lost on restart |
| "Auto-recovery system" | Health checks with automatic restart | Requires manual intervention |
| "Multi-tenant support" | Tenant isolation at data layer | Shared everything |
| "Rate limiting" | Redis/distributed token bucket | In-memory counter |
| "Circuit breaker" | State machine with half-open state | Try/catch with retry |
| "Audit trail" | Immutable log with cryptographic proof | Append-only file |
| "Zero-downtime deployment" | Blue-green or canary with rollback | Restart with downtime |
| "Horizontal scaling" | Load balancer + stateless services | "Just add more servers" |
| "Disaster recovery" | Tested RTO/RPO with runbook | "We have backups" |
| "Security scanning" | SAST/DAST/SCA in CI/CD | Regex pattern matching |
| "Event-driven architecture" | Message broker with guaranteed delivery | Direct function calls |
| "Microservices" | Independent deployment + service discovery | Monolith with multiple files |
| "CQRS implementation" | Separate read/write models + projections | Different database tables |
| "Event sourcing" | Event store with replay capability | Audit log table |
| "Saga pattern" | Compensation logic + state machine | Sequential try/catch |
| "Domain-driven design" | Bounded contexts + aggregates + repositories | Folders named "domain" |
| "Clean architecture" | Dependency inversion + layer separation | Folders named "clean" |
| "Reactive streams" | Backpressure handling + subscription | Observable.subscribe() |
| "GraphQL federation" | Schema stitching + gateway resolution | Multiple GraphQL endpoints |
| "Service mesh" | Sidecar proxies + traffic management | Nginx reverse proxy |

### AI-Specific Fake → Reality Mapping ⭐ NEW

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "LLM integration" | API calls with actual model responses | Hardcoded strings |
| "RAG pipeline" | Vector store + retrieval + augmentation | Keyword search + template |
| "Semantic search" | Embedding model + vector similarity | String contains/regex |
| "AI agents" | Tool use + reasoning + multi-step execution | Linear if/else chain |
| "Prompt engineering" | Versioned prompts + A/B testing | Inline strings |
| "Fine-tuned model" | Training data + training run + deployed model | base model + "tuned for" |
| "AI orchestration" | LangChain/LlamaIndex/custom with tool routing | Sequential API calls |
| "Conversational AI" | Context management + memory + coherence | Stateless Q&A |
| "Multi-modal AI" | Image/audio/video processing with models | File upload only |
| "AI guardrails" | Content filtering + output validation | Try/catch on API call |
| "Streaming responses" | SSE/WebSocket with token streaming | Buffered full response |
| "Token management" | Usage tracking + limits + cost calculation | None or hardcoded limits |
| "Model fallback" | Primary + secondary model with routing | Single model only |
| "Prompt injection defense" | Input sanitization + output validation | "We trust the user" |
| "AI observability" | Token usage + latency + cost metrics | console.log(response) |

### Self-Audit Questions

Before claiming ANY feature works, answer these honestly:

1. **"If I restart the service, does this feature still work?"**
   - NO → You have in-memory state pretending to be persistent

2. **"If I run this on a second server, does it coordinate?"**
   - NO → You have single-node code pretending to be distributed

3. **"If the external service fails, what happens?"**
   - CRASH → You have no error handling
   - HANG → You have no timeouts
   - RETRY FOREVER → You have no circuit breaker

4. **"Where can I see this in a dashboard?"**
   - NOWHERE → Your "monitoring" is console.log

5. **"Can a security auditor verify this protection?"**
   - NO → Your "security" is theater

6. **"If I disconnect the LLM API, does the 'AI feature' still work?"** ⭐ NEW
   - YES → Your "AI" is hardcoded responses

7. **"Can I trace exactly which model processed this request?"** ⭐ NEW
   - NO → Your AI integration has no observability

8. **"What happens if the AI returns invalid/toxic content?"** ⭐ NEW
   - PASS THROUGH → You have no guardrails

---

## ✅ SECTION 3: MANDATORY VERIFICATION PROTOCOL

### BEFORE Writing Any Code

```bash
# MANDATORY: Understand the environment FIRST
docker ps                           # What services exist?
docker inspect <container>          # What are the credentials?
cat .env 2>/dev/null || echo "No .env"  # What config exists?
ls -la package.json tsconfig.json   # What's the project structure?
cat package.json | jq '.dependencies' # What dependencies exist?
```

**If you skip this step, your implementation WILL fail.**

### AFTER Writing Code, BEFORE Claiming Completion

```bash
# MANDATORY: Prove it works
pnpm typecheck                      # Type safety verified
pnpm lint                           # Code quality verified
pnpm test                           # Unit tests pass
pnpm test:integration               # Integration tests pass
<db-verification>                   # Query real database
<api-verification>                  # Call real endpoints
<service-verification>              # Check service health
```

### The "Show Me" Test

Before claiming ANYTHING is complete, ask yourself:

> **"If the user said 'prove it RIGHT NOW', what single command would I run?"**

| Your Answer | Verdict |
|-------------|---------|
| "Here are the files I created" | ❌ NOT COMPLETE |
| "Let me run the tests first..." | ❌ NOT COMPLETE |
| "The error indicates..." | ❌ NOT COMPLETE (errors = broken) |
| "Run `pnpm test` → Output: 12/12 passed" | ✅ COMPLETE |

### The "Reboot Test" ⭐ NEW

```bash
# Kill everything and restart
docker compose down -v
docker compose up -d
sleep 10  # Wait for services

# Verify state persisted
<verify-data-exists>
<verify-feature-works>
```

If it doesn't work after reboot, it was never "persistent".

---

## 📋 SECTION 4: REQUIRED EVIDENCE FORMAT

Every completion claim MUST follow this exact format:

```markdown
## Feature: [Name]

### Status: ✅ VERIFIED | ❌ BROKEN | ⚠️ PARTIAL | 🚫 FAKE

### Truth Protocol Check:
| Claim | Evidence | Verdict |
|-------|----------|---------|
| [What I'm claiming] | [How to verify] | ✅/❌ |

### Environment Verified:
```bash
$ docker ps
[actual output showing required services running]
```

### Test Execution:
```bash
$ pnpm test
[actual test output - not paraphrased]
Pass: X | Fail: Y | Skip: Z
```

### Service Verification:
```bash
$ curl -sf http://localhost:3000/health | jq
[actual response]
```

### Database Verification:
```bash
$ docker exec postgres psql -U user -d db -c "SELECT COUNT(*) FROM table"
[actual count]
```

### AI Integration Verification (if applicable): ⭐ NEW
```bash
$ curl -X POST http://localhost:3000/ai/complete \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test"}' | jq '.model, .tokens_used'
[actual model name and token count]
```

### Files Created:
| File | Purpose | Lines | TODOs | Test Coverage |
|------|---------|-------|-------|---------------|
| `path/to/file.ts` | [what it does] | [count] | 0 | [%] |

### What Actually Works:
- [Specific capability] — Proof: `<command>`

### What Does NOT Work (Honest Assessment):
- [Limitation] — Reason: [honest explanation]
- [Missing piece] — Ticket: [reference if applicable]

### Deception Check:
- [ ] No console.log as monitoring
- [ ] No in-memory as database
- [ ] No setTimeout as queue
- [ ] No Base64 as encryption
- [ ] No regex as security scanning
- [ ] No if/else as AI
- [ ] No hardcoded responses as AI ⭐ NEW
- [ ] No template filling as generation ⭐ NEW
- [ ] No keyword matching as NLP ⭐ NEW

### User Verification Command:
```bash
<single command user can run>
# Expected output: <what they should see>
```
```

---

## 🏢 SECTION 5: FORTUNE 100 COMPLIANCE GATE

### Minimum Enterprise Standards

Before claiming "enterprise-ready" or "production-ready", ALL must be true:

#### Authentication & Authorization
- [ ] JWT with RS256 (not HS256)
- [ ] Token rotation with zero-downtime
- [ ] Session management with Redis (not in-memory)
- [ ] MFA support (TOTP/WebAuthn)
- [ ] SSO integration (SAML 2.0/OIDC)
- [ ] Fine-grained RBAC with policy engine
- [ ] API key management with scopes + rotation
- [ ] Service-to-service auth (mTLS/JWT)
- [ ] Impersonation audit trail

#### Security
- [ ] Content Security Policy headers
- [ ] Rate limiting with Redis (not memory counter)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (output encoding + CSP)
- [ ] CSRF tokens (double-submit cookie)
- [ ] Input validation with JSON schema
- [ ] Secrets in Vault/KMS (not env vars for production)
- [ ] TLS 1.3 everywhere (no TLS 1.2 except legacy)
- [ ] Security scanning in CI/CD (SAST/DAST/SCA)
- [ ] Dependency vulnerability scanning
- [ ] Container image scanning
- [ ] Network policies (zero trust)
- [ ] WAF integration

#### Observability
- [ ] Structured logging to persistent storage (JSON)
- [ ] Log levels properly used (not everything as INFO)
- [ ] Distributed tracing (OpenTelemetry/Jaeger)
- [ ] Trace context propagation across services
- [ ] Metrics emission (Prometheus/CloudWatch)
- [ ] Custom business metrics
- [ ] Real-time alerting (PagerDuty/OpsGenie)
- [ ] Alert fatigue prevention (grouping/throttling)
- [ ] Error tracking (Sentry) with source maps
- [ ] Performance profiling capability
- [ ] Audit trail with cryptographic signatures
- [ ] Log retention policy (compliance-driven)

#### Reliability
- [ ] Circuit breakers on ALL external calls
- [ ] Retry with exponential backoff + jitter
- [ ] Timeouts on ALL network calls (connect + read)
- [ ] Health checks with dependency verification
- [ ] Liveness vs readiness probes differentiated
- [ ] Graceful shutdown handling (SIGTERM)
- [ ] Database connection pooling with limits
- [ ] Back-pressure handling (queue depth limits)
- [ ] Bulkhead isolation (thread pool separation)
- [ ] Chaos engineering tested

#### Scalability
- [ ] Horizontal scaling capability proven
- [ ] Stateless services (state in Redis/DB)
- [ ] Load tested to 10,000+ concurrent users
- [ ] 99th percentile latency < 500ms
- [ ] CDN for static assets
- [ ] Async job processing (real queue, not setTimeout)
- [ ] Database read replicas for scale
- [ ] Connection pooling configured correctly
- [ ] Auto-scaling policies defined
- [ ] Resource limits and requests set

#### Compliance
- [ ] Immutable audit trail (SOC2 requirement)
- [ ] Data encryption at rest (AES-256-GCM)
- [ ] Data encryption in transit (TLS 1.3)
- [ ] GDPR data handling (right to delete, export)
- [ ] Data retention policies enforced
- [ ] PII detection and handling
- [ ] Automated compliance reporting
- [ ] Access reviews automated
- [ ] Data classification implemented

#### Disaster Recovery
- [ ] Multi-region capability
- [ ] Documented RTO < 1 hour
- [ ] Documented RPO < 15 minutes
- [ ] Tested backup restoration (monthly)
- [ ] Runbook for incidents (up to date)
- [ ] Zero-downtime deployment (blue-green/canary)
- [ ] Rollback capability tested
- [ ] Database failover tested
- [ ] Cross-region data replication

### Compliance Scoring

```
FORTUNE 100 READINESS SCORE:
□ 0-25%  → "Development prototype" (honest)
□ 26-50% → "Alpha/internal testing only"
□ 51-75% → "Beta with known limitations"
□ 76-90% → "Production with caveats documented"
□ 91-99% → "Production ready"
□ 100%   → "Enterprise/Fortune 100 ready"
```

**Never claim a higher tier than your actual score.**

---

## 🤖 SECTION 6: AI/LLM INTEGRATION STANDARDS ⭐ NEW

### AI Feature Classification

| Level | Name | Description | Example |
|-------|------|-------------|---------|
| 0 | Fake AI | No model integration | if/else claiming to be AI |
| 1 | API Wrapper | Simple API call | Single completion call |
| 2 | Structured AI | Schema-validated output | Function calling with types |
| 3 | Context-Aware | RAG or memory | Chat with document context |
| 4 | Agentic | Tool use + reasoning | Multi-step task completion |
| 5 | Autonomous | Self-directed execution | Human provides intent only |

### Mandatory AI Implementation Requirements

#### Level 1+ (Any Real AI):
```typescript
// ✅ REQUIRED: Model abstraction
interface LLMProvider {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterator<StreamChunk>;
}

// ✅ REQUIRED: Request tracking
interface CompletionRequest {
  id: string;           // Trace ID
  model: string;        // Actual model identifier
  messages: Message[];
  maxTokens: number;
  temperature: number;
}

// ✅ REQUIRED: Response tracking
interface CompletionResponse {
  id: string;
  model: string;        // Actual model used (may differ from request)
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
}
```

#### Level 2+ (Structured Output):
```typescript
// ✅ REQUIRED: Schema validation
import { z } from 'zod';

const outputSchema = z.object({
  analysis: z.string(),
  confidence: z.number().min(0).max(1),
  suggestions: z.array(z.string())
});

// ✅ REQUIRED: Validation before use
const validated = outputSchema.safeParse(aiResponse);
if (!validated.success) {
  // Handle gracefully, don't trust unvalidated AI output
}
```

#### Level 3+ (RAG):
```typescript
// ✅ REQUIRED: Vector store integration
interface VectorStore {
  upsert(documents: Document[]): Promise<void>;
  query(embedding: number[], topK: number): Promise<ScoredDocument[]>;
  delete(ids: string[]): Promise<void>;
}

// ✅ REQUIRED: Embedding tracking
interface Document {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  embeddingModel: string;  // Track which model created this
  createdAt: Date;
}
```

#### Level 4+ (Agentic):
```typescript
// ✅ REQUIRED: Tool definition
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(params: unknown): Promise<ToolResult>;
}

// ✅ REQUIRED: Execution tracking
interface AgentExecution {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  steps: AgentStep[];
  totalTokens: number;
  totalCost: number;
  outcome: 'success' | 'failure' | 'timeout' | 'cancelled';
}

interface AgentStep {
  type: 'reasoning' | 'tool_call' | 'observation';
  content: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  tokenCount: number;
  durationMs: number;
}
```

### AI Anti-Patterns to Detect

```typescript
// 🚫 FAKE: Hardcoded responses
async function analyzeWithAI(input: string): Promise<string> {
  return "This is a great analysis!"; // No model call
}

// 🚫 FAKE: Random selection
async function generateResponse(): Promise<string> {
  const responses = ["Great!", "Interesting!", "Tell me more!"];
  return responses[Math.floor(Math.random() * responses.length)];
}

// 🚫 FAKE: Template filling
async function generateEmail(context: Context): Promise<string> {
  return `Dear ${context.name}, Thank you for your ${context.topic}...`;
}

// 🚫 FAKE: Keyword matching
async function detectIntent(input: string): Promise<string> {
  if (input.includes('help')) return 'support';
  if (input.includes('buy')) return 'sales';
  return 'general';
}

// 🚫 FAKE: Simulated delay
async function processWithAI(input: string): Promise<string> {
  await sleep(1000); // Fake "thinking"
  return precannedResponse;
}
```

### AI Observability Requirements

Every AI call MUST emit:
```typescript
{
  // Request
  requestId: string,
  model: string,
  promptTokens: number,
  maxTokens: number,
  temperature: number,
  
  // Response
  completionTokens: number,
  latencyMs: number,
  finishReason: string,
  
  // Cost
  estimatedCost: number,
  
  // Quality (if applicable)
  validationPassed: boolean,
  guardrailTriggered: boolean
}
```

### AI Safety Checklist

- [ ] Prompt injection defense (input sanitization)
- [ ] Output validation (schema + content)
- [ ] PII detection before sending to model
- [ ] Content moderation on outputs
- [ ] Token limit enforcement
- [ ] Cost caps per user/request
- [ ] Rate limiting per user
- [ ] Timeout on model calls
- [ ] Fallback model configured
- [ ] Human escalation path for edge cases

---

## ⏱️ SECTION 7: WORKFLOW & ORCHESTRATION STANDARDS ⭐ NEW

### The Workflow Fake → Reality Mapping

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "Long-running workflow" | Temporal/Conductor/Step Functions | for loop or Promise chain |
| "Durable execution" | Persisted state + replay capability | In-memory state |
| "Workflow orchestration" | Visual workflow + state management | Sequential function calls |
| "Saga pattern" | Compensation handlers + state machine | Try/catch chain |
| "Scheduled jobs" | Cron with persistence (Temporal/Agenda) | setInterval/node-cron in memory |
| "Retry with backoff" | Configurable policy + dead letter | setTimeout in catch block |
| "Workflow versioning" | Deterministic replay + migration | Code changes break running workflows |

### Temporal.io Requirements (Production Workflows)

```typescript
// ✅ REQUIRED: Temporal for any workflow > 30 seconds or multi-step

// Workflow Definition
import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

const { processPayment, sendNotification, updateInventory } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['ValidationError', 'NotFoundError'],
  },
});

export async function orderWorkflow(order: Order): Promise<OrderResult> {
  // ✅ Durable: survives worker restart
  const paymentResult = await processPayment(order.payment);
  
  // ✅ Durable timer: survives restart
  await sleep('24 hours'); // Wait for fulfillment window
  
  // ✅ Automatic retry with backoff
  await updateInventory(order.items);
  
  // ✅ Compensation on failure handled by Temporal
  await sendNotification(order.customer, 'completed');
  
  return { status: 'completed', paymentId: paymentResult.id };
}

// Activity Definition (side effects)
export async function processPayment(payment: Payment): Promise<PaymentResult> {
  // Activities contain actual side effects
  // Temporal handles retry, timeout, heartbeat
  return await paymentGateway.charge(payment);
}
```

### Workflow Anti-Patterns

```typescript
// 🚫 FORBIDDEN: Sequential promises as "workflow"
async function orderWorkflow(order: Order) {
  await processPayment(order);    // Lost on restart
  await sleep(86400000);          // In-memory timer
  await updateInventory(order);   // No compensation
  await sendEmail(order);         // No retry policy
}

// 🚫 FORBIDDEN: setInterval as "scheduler"
setInterval(async () => {
  await processScheduledJobs();   // No distributed coordination
}, 60000);                        // Runs on every instance!

// 🚫 FORBIDDEN: In-memory state machine
class WorkflowStateMachine {
  private state = 'pending';      // Lost on restart!
  async transition(event: Event) {
    // No persistence, no replay
  }
}

// 🚫 FORBIDDEN: Promise.all as "parallel workflow"
await Promise.all([
  task1(),  // If task3 fails, task1 & task2 already ran
  task2(),  // No compensation
  task3(),  // No individual retry policy
]);
```

### Temporal Verification Commands

```bash
# Verify Temporal is running
$ docker exec temporal-server tctl cluster health
# Expected: SERVING

# Verify workflow registered
$ docker exec temporal-server tctl workflow list --namespace default
# Expected: List of registered workflows

# Verify workflow execution
$ docker exec temporal-server tctl workflow show -w <workflow-id>
# Expected: Workflow history with events
```

### When to Use What

| Scenario | Solution | NOT This |
|----------|----------|----------|
| < 30 sec, single step | Direct function call | - |
| < 30 sec, needs retry | BullMQ job | setTimeout |
| > 30 sec, single step | BullMQ with progress | Temporal (overkill) |
| Multi-step, needs compensation | Temporal workflow | Promise chain |
| Scheduled recurring | Temporal schedule / BullMQ repeat | setInterval |
| Human-in-the-loop | Temporal signal/query | Polling database |
| Long wait (hours/days) | Temporal durable timer | setTimeout |
| Fan-out/fan-in | Temporal child workflows | Promise.all |

---

## 📬 SECTION 8: QUEUE & MESSAGING STANDARDS ⭐ NEW

### The Queue Fake → Reality Mapping

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "Job queue" | BullMQ/RabbitMQ/SQS with persistence | setTimeout or in-memory array |
| "Message broker" | RabbitMQ/Kafka/Redis Streams | EventEmitter |
| "Guaranteed delivery" | Acknowledgment + dead letter queue | Fire and forget |
| "At-least-once delivery" | Persistence + retry + idempotency | In-memory queue |
| "Exactly-once processing" | Idempotency keys + transactions | "We deduplicate" |
| "Priority queue" | Priority levels with fair scheduling | Sorted array |
| "Delayed jobs" | Persistent delayed queue | setTimeout |
| "Rate limiting" | Token bucket with Redis | In-memory counter |
| "Backpressure" | Queue depth limits + rejection | Unbounded queue |

### BullMQ Requirements (Redis-Based Queues)

```typescript
// ✅ REQUIRED: BullMQ for job processing

import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

// ✅ REQUIRED: Dedicated Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// ✅ REQUIRED: Queue with proper configuration
const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,        // Keep last 1000 completed
      age: 24 * 3600,     // Or 24 hours
    },
    removeOnFail: {
      count: 5000,        // Keep failed for debugging
    },
  },
});

// ✅ REQUIRED: Worker with concurrency control
const worker = new Worker(
  'email',
  async (job) => {
    // ✅ Idempotency check
    const processed = await redis.get(`email:processed:${job.data.idempotencyKey}`);
    if (processed) {
      return { skipped: true, reason: 'duplicate' };
    }

    // Process job
    const result = await sendEmail(job.data);

    // ✅ Mark as processed (with TTL)
    await redis.setex(`email:processed:${job.data.idempotencyKey}`, 86400, '1');

    return result;
  },
  {
    connection,
    concurrency: 10,           // Process 10 jobs in parallel
    limiter: {
      max: 100,                // Max 100 jobs
      duration: 1000,          // Per second
    },
  }
);

// ✅ REQUIRED: Error handling
worker.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job?.id,
    queue: 'email',
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });

  if (job?.attemptsMade === job?.opts.attempts) {
    // Final failure - alert
    alerting.critical('Email job permanently failed', { jobId: job.id });
  }
});

// ✅ REQUIRED: Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  await emailQueue.close();
});
```

### RabbitMQ Requirements (Message Broker)

```typescript
// ✅ REQUIRED: RabbitMQ for inter-service messaging

import amqp, { Connection, Channel } from 'amqplib';

class RabbitMQClient {
  private connection: Connection;
  private channel: Channel;

  async connect(): Promise<void> {
    // ✅ REQUIRED: Connection with retry
    this.connection = await amqp.connect({
      hostname: process.env.RABBITMQ_HOST,
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASS,
      heartbeat: 60,
    });

    this.channel = await this.connection.createChannel();

    // ✅ REQUIRED: Prefetch for backpressure
    await this.channel.prefetch(10);

    // ✅ REQUIRED: Dead letter exchange
    await this.channel.assertExchange('dlx', 'direct', { durable: true });
    await this.channel.assertQueue('dead-letter-queue', { durable: true });
    await this.channel.bindQueue('dead-letter-queue', 'dlx', '');
  }

  async setupQueue(queueName: string): Promise<void> {
    // ✅ REQUIRED: Durable queue with DLX
    await this.channel.assertQueue(queueName, {
      durable: true,
      deadLetterExchange: 'dlx',
      messageTtl: 86400000, // 24 hour TTL
    });
  }

  async publish(queue: string, message: unknown): Promise<void> {
    // ✅ REQUIRED: Persistent messages
    this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        messageId: uuidv4(),
        timestamp: Date.now(),
        contentType: 'application/json',
      }
    );
  }

  async consume(queue: string, handler: MessageHandler): Promise<void> {
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        // ✅ REQUIRED: Explicit acknowledgment
        this.channel.ack(msg);
      } catch (error) {
        // ✅ REQUIRED: Nack with requeue logic
        const requeue = msg.fields.redelivered === false;
        this.channel.nack(msg, false, requeue);
      }
    });
  }
}
```

### Queue Anti-Patterns

```typescript
// 🚫 FORBIDDEN: In-memory queue
const jobQueue: Job[] = [];
jobQueue.push(newJob);  // Lost on restart!

// 🚫 FORBIDDEN: setTimeout as delayed job
setTimeout(() => processJob(job), 60000);  // Not persistent

// 🚫 FORBIDDEN: EventEmitter as message broker
eventEmitter.emit('order.created', order);  // Single process only

// 🚫 FORBIDDEN: No acknowledgment
channel.consume(queue, (msg) => {
  processMessage(msg);
  // Where's the ack/nack?
});

// 🚫 FORBIDDEN: No dead letter queue
await channel.assertQueue('orders', { durable: true });
// What happens to failed messages?

// 🚫 FORBIDDEN: Unbounded queue consumption
const worker = new Worker('jobs', handler, {
  concurrency: 1000,  // Will overwhelm downstream
});
```

### Queue Verification Commands

```bash
# BullMQ: Check Redis queue
$ docker exec redis redis-cli LLEN bull:email:wait
# Expected: Number of waiting jobs

$ docker exec redis redis-cli ZCARD bull:email:delayed
# Expected: Number of delayed jobs

# RabbitMQ: Check queue status
$ docker exec rabbitmq rabbitmqctl list_queues name messages consumers
# Expected: Queue stats

# RabbitMQ: Check dead letter queue
$ docker exec rabbitmq rabbitmqctl list_queues name messages | grep dead-letter
# Expected: DLQ with count (should be low)
```

---

## 🔐 SECTION 9: DISTRIBUTED SYSTEMS STANDARDS ⭐ NEW

### The Distributed Fake → Reality Mapping

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "Distributed lock" | Redlock/ZooKeeper/etcd | In-memory mutex |
| "Leader election" | Consensus algorithm (Raft/Paxos) | "First to start" |
| "Distributed cache" | Redis Cluster/Memcached | In-memory Map per node |
| "Service discovery" | Consul/etcd/K8s DNS | Hardcoded URLs |
| "Distributed tracing" | Jaeger/Zipkin/OpenTelemetry | Request ID logging |
| "Cluster coordination" | ZooKeeper/etcd/Consul | Shared database polling |
| "Consensus" | Raft/Paxos implementation | "Database is source of truth" |
| "Partition tolerance" | Handles network splits | "It'll reconnect" |

### Redlock Requirements (Distributed Locking)

```typescript
// ✅ REQUIRED: Redlock for distributed locks

import Redlock from 'redlock';
import { Redis } from 'ioredis';

// ✅ REQUIRED: Multiple Redis instances for Redlock
const redisInstances = [
  new Redis({ host: 'redis-1', port: 6379 }),
  new Redis({ host: 'redis-2', port: 6379 }),
  new Redis({ host: 'redis-3', port: 6379 }),
];

// ✅ REQUIRED: Redlock with proper configuration
const redlock = new Redlock(redisInstances, {
  driftFactor: 0.01,       // Clock drift factor
  retryCount: 10,          // Retry attempts
  retryDelay: 200,         // Time between retries (ms)
  retryJitter: 200,        // Random jitter (ms)
  automaticExtensionThreshold: 500, // Auto-extend threshold (ms)
});

// ✅ REQUIRED: Lock usage pattern
async function processExclusiveResource(resourceId: string): Promise<void> {
  const lockKey = `locks:resource:${resourceId}`;
  const ttl = 30000; // 30 second lock

  let lock: Redlock.Lock | null = null;

  try {
    // Acquire lock
    lock = await redlock.acquire([lockKey], ttl);

    // ✅ REQUIRED: Track lock acquisition
    logger.info('Lock acquired', { resourceId, lockId: lock.value });

    // Do exclusive work
    await processResource(resourceId);

  } catch (error) {
    if (error instanceof Redlock.LockError) {
      // ✅ REQUIRED: Handle lock failure gracefully
      logger.warn('Could not acquire lock', { resourceId, error: error.message });
      throw new ResourceBusyError(resourceId);
    }
    throw error;
  } finally {
    // ✅ REQUIRED: Always release lock
    if (lock) {
      try {
        await lock.release();
        logger.info('Lock released', { resourceId });
      } catch (error) {
        // Lock may have expired - log but don't throw
        logger.warn('Lock release failed', { resourceId, error });
      }
    }
  }
}

// ✅ REQUIRED: Lock extension for long operations
async function processLongRunningTask(resourceId: string): Promise<void> {
  const lock = await redlock.acquire([`locks:${resourceId}`], 10000);

  try {
    // For long operations, extend the lock
    const extendInterval = setInterval(async () => {
      try {
        await lock.extend(10000);
      } catch {
        clearInterval(extendInterval);
        // Handle extension failure - abort operation
      }
    }, 5000);

    await longRunningOperation();

    clearInterval(extendInterval);
  } finally {
    await lock.release();
  }
}
```

### Distributed Lock Anti-Patterns

```typescript
// 🚫 FORBIDDEN: In-memory lock
const locks = new Map<string, boolean>();
if (!locks.get(resourceId)) {
  locks.set(resourceId, true);  // Only works on ONE node!
  await process();
  locks.delete(resourceId);
}

// 🚫 FORBIDDEN: Single Redis SETNX (not safe)
const acquired = await redis.setnx(`lock:${id}`, '1');
// No automatic expiry! Dead process = permanent lock

// 🚫 FORBIDDEN: Database row locking for distributed lock
await db.query('SELECT * FROM resources WHERE id = $1 FOR UPDATE');
// Only works within single transaction, not across services

// 🚫 FORBIDDEN: No lock TTL
const lock = await redlock.acquire([key], Infinity);
// Dead process = permanent lock

// 🚫 FORBIDDEN: Ignoring lock errors
try {
  const lock = await redlock.acquire([key], 10000);
} catch {
  // Proceed anyway - defeats the purpose!
  await processResource();
}
```

### Distributed ID Generation

```typescript
// ✅ REQUIRED: Distributed-safe ID generation

// Option 1: UUIDv7 (time-ordered, k-sortable)
import { uuidv7 } from 'uuidv7';
const id = uuidv7(); // Sortable, unique across nodes

// Option 2: ULID (Universally Unique Lexicographically Sortable Identifier)
import { ulid } from 'ulid';
const id = ulid(); // Sortable, unique across nodes

// Option 3: Snowflake-style (for high volume)
import { Snowflake } from 'nodejs-snowflake';
const snowflake = new Snowflake({
  custom_epoch: 1609459200000,
  instance_id: parseInt(process.env.INSTANCE_ID || '1'),
});
const id = snowflake.getUniqueID();

// 🚫 FORBIDDEN: Auto-increment across distributed system
// 🚫 FORBIDDEN: UUID v4 when ordering matters
// 🚫 FORBIDDEN: Timestamp alone (collisions!)
// 🚫 FORBIDDEN: Math.random() for IDs
```

### Distributed Systems Verification

```bash
# Verify Redlock with multiple Redis instances
$ for i in 1 2 3; do docker exec redis-$i redis-cli PING; done
# Expected: PONG PONG PONG

# Test lock acquisition
$ curl -X POST http://localhost:3000/test/acquire-lock/resource-1
# Expected: { "acquired": true, "lockId": "..." }

# Test concurrent lock (should fail)
$ curl -X POST http://localhost:3000/test/acquire-lock/resource-1
# Expected: { "acquired": false, "reason": "resource_busy" }

# Verify lock in Redis
$ docker exec redis-1 redis-cli KEYS "locks:*"
# Expected: List of active locks
```

---

## 📝 SECTION 10: LOGGING & OBSERVABILITY STANDARDS ⭐ NEW

### The Logging Fake → Reality Mapping

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "Structured logging" | Winston/Pino with JSON format | console.log |
| "Log aggregation" | ELK/Loki/CloudWatch Logs | Local files only |
| "Log levels" | DEBUG/INFO/WARN/ERROR properly used | Everything as INFO |
| "Audit logging" | Immutable store with integrity proof | Append-only file |
| "Request tracing" | Correlation ID across services | No request context |
| "Metrics" | Prometheus/DataDog/CloudWatch | console.log counters |
| "Alerting" | PagerDuty/OpsGenie rules | Email on error |
| "Distributed tracing" | Jaeger/Zipkin spans | Request ID logging |

### Winston Requirements (Structured Logging)

```typescript
// ✅ REQUIRED: Winston for production logging

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// ✅ REQUIRED: Custom format with all context
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'ISO' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// ✅ REQUIRED: Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME,
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
    hostname: os.hostname(),
  },
  transports: [
    // ✅ REQUIRED: Rotating file transport for persistence
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    // ✅ REQUIRED: Error-specific log file
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '100m',
      maxFiles: '30d',
    }),

    // ✅ REQUIRED: Console for development/container logs
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],

  // ✅ REQUIRED: Exception and rejection handling
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});

// ✅ REQUIRED: Request context logging
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

const contextLogger = {
  info: (message: string, meta?: object) => {
    const context = asyncLocalStorage.getStore();
    logger.info(message, { ...context, ...meta });
  },
  error: (message: string, error?: Error, meta?: object) => {
    const context = asyncLocalStorage.getStore();
    logger.error(message, {
      ...context,
      ...meta,
      error: error?.message,
      stack: error?.stack,
    });
  },
  warn: (message: string, meta?: object) => {
    const context = asyncLocalStorage.getStore();
    logger.warn(message, { ...context, ...meta });
  },
  debug: (message: string, meta?: object) => {
    const context = asyncLocalStorage.getStore();
    logger.debug(message, { ...context, ...meta });
  },
};

// ✅ REQUIRED: Request middleware
function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const context: RequestContext = {
    requestId: req.headers['x-request-id'] as string || uuidv4(),
    userId: req.user?.id,
    sessionId: req.session?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
  };

  // Propagate request ID in response
  res.setHeader('x-request-id', context.requestId);

  asyncLocalStorage.run(context, () => next());
}
```

### Log Output Format Requirements

```typescript
// ✅ REQUIRED: Structured log format
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "message": "User login successful",
  "service": "auth-service",
  "version": "1.2.3",
  "environment": "production",
  "hostname": "auth-service-abc123",
  "requestId": "req-uuid-here",
  "userId": "user-123",
  "sessionId": "sess-456",
  "duration": 45,
  "metadata": {
    "loginMethod": "oauth",
    "provider": "google"
  }
}

// 🚫 FORBIDDEN: Unstructured logs
console.log('User logged in: ' + userId);
console.log(`Error: ${error}`);
```

### Log Levels Usage

| Level | When to Use | Example |
|-------|-------------|---------|
| **ERROR** | Operation failed, needs attention | Database connection failed |
| **WARN** | Potential issue, degraded operation | Cache miss, using fallback |
| **INFO** | Business events, audit trail | User logged in, order placed |
| **DEBUG** | Development troubleshooting | Function entry, variable values |
| **TRACE** | Detailed debugging | Loop iterations, raw payloads |

```typescript
// ✅ REQUIRED: Correct level usage
logger.error('Payment processing failed', { orderId, error: err.message });
logger.warn('Rate limit approaching', { userId, current: 90, limit: 100 });
logger.info('Order created', { orderId, amount, userId });
logger.debug('Cache lookup', { key, hit: false, fallback: 'database' });

// 🚫 FORBIDDEN: Wrong level usage
logger.info('ERROR: something went wrong');  // Use error level!
logger.error('User logged in');              // Use info level!
logger.debug('Critical security alert');     // Use error level!
```

### Metrics Requirements

```typescript
// ✅ REQUIRED: Prometheus metrics

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const registry = new Registry();

// ✅ REQUIRED: Request metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// ✅ REQUIRED: Business metrics
const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['product_type', 'region'],
  registers: [registry],
});

// ✅ REQUIRED: Resource metrics
const activeConnections = new Gauge({
  name: 'active_database_connections',
  help: 'Current active database connections',
  registers: [registry],
});

// ✅ REQUIRED: AI-specific metrics
const llmRequestDuration = new Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM API call duration',
  labelNames: ['model', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

const llmTokensUsed = new Counter({
  name: 'llm_tokens_total',
  help: 'Total LLM tokens used',
  labelNames: ['model', 'type'], // type: prompt, completion
  registers: [registry],
});

// ✅ REQUIRED: Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

### Logging Anti-Patterns

```typescript
// 🚫 FORBIDDEN: console.log in production
console.log('Processing order:', orderId);

// 🚫 FORBIDDEN: Logging sensitive data
logger.info('User logged in', { password: user.password });
logger.debug('API request', { apiKey: req.headers.authorization });

// 🚫 FORBIDDEN: No context
logger.error('Something went wrong');  // What? Where? When?

// 🚫 FORBIDDEN: String concatenation
logger.info('Order ' + orderId + ' created by ' + userId);

// 🚫 FORBIDDEN: Logging inside loops at INFO level
for (const item of items) {
  logger.info('Processing item', { item });  // 1M items = 1M logs
}

// 🚫 FORBIDDEN: No error stack trace
logger.error('Error occurred', { error: err.message });  // Need stack!

// ✅ REQUIRED: Full error context
logger.error('Error occurred', {
  error: err.message,
  stack: err.stack,
  code: err.code,
});
```

### Observability Verification

```bash
# Check log files exist and rotate
$ ls -la logs/
# Expected: app-2025-01-15.log, error-2025-01-15.log

# Check log format
$ tail -1 logs/app-$(date +%Y-%m-%d).log | jq
# Expected: Valid JSON with all required fields

# Check metrics endpoint
$ curl -sf http://localhost:3000/metrics | head -20
# Expected: Prometheus format metrics

# Check specific metric
$ curl -sf http://localhost:3000/metrics | grep http_requests_total
# Expected: http_requests_total{method="GET",path="/api/users",status="200"} 1234

# Check request ID propagation
$ curl -i http://localhost:3000/api/test
# Expected: x-request-id header in response
```

---

## 🧠 SECTION 11: VECTOR MEMORY & CONTEXT PERSISTENCE ⭐ NEW

### The Memory Fake → Reality Mapping

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "Long-term memory" | Vector DB (LanceDB/pgvector/Pinecone) | In-memory array |
| "Context persistence" | Persistent storage with retrieval | Session-only memory |
| "Semantic search" | Embedding model + vector similarity | Keyword/regex search |
| "Conversation history" | Database-backed with pagination | In-memory chat array |
| "Knowledge retrieval" | RAG with vector store | Hardcoded responses |
| "Context window management" | Summarization + retrieval strategy | Truncation only |

### LanceDB Requirements (Embedded Vector DB)

```typescript
// ✅ REQUIRED: LanceDB for local/embedded vector storage

import * as lancedb from 'lancedb';
import { OpenAIEmbeddingFunction } from 'lancedb/embedding';

// ✅ REQUIRED: Persistent database path
const db = await lancedb.connect({
  uri: './data/lancedb',  // Persistent storage
  // For S3: uri: 's3://bucket/lancedb'
});

// ✅ REQUIRED: Embedding function configuration
const embedFunction = new OpenAIEmbeddingFunction({
  model: 'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ REQUIRED: Schema definition
interface ConversationMemory {
  id: string;
  userId: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  embedding: number[];  // Vector
  metadata: {
    timestamp: Date;
    tokenCount: number;
    importance: number;  // For prioritized retrieval
    summarized: boolean;
  };
}

// ✅ REQUIRED: Table with vector index
const memoryTable = await db.createTable('conversation_memory', data, {
  embeddingFunction: embedFunction,
  mode: 'overwrite',  // or 'append'
});

// ✅ REQUIRED: Create vector index
await memoryTable.createIndex({
  column: 'embedding',
  indexType: 'IVF_PQ',
  numPartitions: 256,
  numSubVectors: 96,
});

// ✅ REQUIRED: Semantic retrieval
async function retrieveRelevantContext(
  query: string,
  userId: string,
  limit: number = 10
): Promise<ConversationMemory[]> {
  const results = await memoryTable
    .search(query)
    .where(`userId = '${userId}'`)
    .limit(limit)
    .execute();

  return results.map(r => ({
    ...r,
    similarity: r._distance,  // Track similarity score
  }));
}

// ✅ REQUIRED: Memory persistence
async function persistMemory(memory: ConversationMemory): Promise<void> {
  await memoryTable.add([memory]);
  
  // ✅ REQUIRED: Log memory operations
  logger.info('Memory persisted', {
    id: memory.id,
    userId: memory.userId,
    tokenCount: memory.metadata.tokenCount,
  });
}
```

### pgvector Requirements (PostgreSQL Vector Extension)

```typescript
// ✅ REQUIRED: pgvector for production-scale vector storage

import { Pool } from 'pg';
import pgvector from 'pgvector/pg';

// ✅ REQUIRED: Enable extension
await pool.query('CREATE EXTENSION IF NOT EXISTS vector');

// ✅ REQUIRED: Table with vector column
await pool.query(`
  CREATE TABLE IF NOT EXISTS conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_id UUID NOT NULL,
    content TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    embedding vector(1536),  -- OpenAI embedding dimension
    importance FLOAT DEFAULT 0.5,
    token_count INTEGER NOT NULL,
    summarized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ✅ REQUIRED: Indexes
    CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
  );
  
  -- ✅ REQUIRED: Vector index for fast similarity search
  CREATE INDEX IF NOT EXISTS idx_memory_embedding 
    ON conversation_memory 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  
  -- ✅ REQUIRED: User + time index for filtering
  CREATE INDEX IF NOT EXISTS idx_memory_user_time 
    ON conversation_memory (user_id, created_at DESC);
`);

// ✅ REQUIRED: Semantic search function
async function searchMemory(
  embedding: number[],
  userId: string,
  limit: number = 10,
  minSimilarity: number = 0.7
): Promise<MemoryResult[]> {
  const result = await pool.query(`
    SELECT 
      id, content, role, importance, created_at,
      1 - (embedding <=> $1::vector) as similarity
    FROM conversation_memory
    WHERE user_id = $2
      AND 1 - (embedding <=> $1::vector) > $3
    ORDER BY embedding <=> $1::vector
    LIMIT $4
  `, [pgvector.toSql(embedding), userId, minSimilarity, limit]);
  
  return result.rows;
}

// ✅ REQUIRED: Memory compaction (summarize old memories)
async function compactMemories(userId: string, olderThan: Date): Promise<void> {
  // Get old unsummarized memories
  const oldMemories = await pool.query(`
    SELECT id, content FROM conversation_memory
    WHERE user_id = $1 
      AND created_at < $2 
      AND summarized = FALSE
    ORDER BY created_at ASC
    LIMIT 100
  `, [userId, olderThan]);
  
  if (oldMemories.rows.length < 10) return;
  
  // Summarize with LLM
  const summary = await llm.summarize(
    oldMemories.rows.map(m => m.content).join('\n')
  );
  
  // Store summary as new memory
  await persistMemory({
    userId,
    content: summary,
    role: 'system',
    metadata: { summarized: true, importance: 0.8 }
  });
  
  // Mark originals as summarized
  await pool.query(`
    UPDATE conversation_memory 
    SET summarized = TRUE 
    WHERE id = ANY($1)
  `, [oldMemories.rows.map(m => m.id)]);
}
```

### Context Window Management

```typescript
// ✅ REQUIRED: Smart context assembly

interface ContextConfig {
  maxTokens: number;          // e.g., 8000 for GPT-4
  reserveForResponse: number; // e.g., 2000
  recentMessagesCount: number; // e.g., 10
  semanticResultsCount: number; // e.g., 5
}

async function assembleContext(
  currentQuery: string,
  userId: string,
  config: ContextConfig
): Promise<AssembledContext> {
  const availableTokens = config.maxTokens - config.reserveForResponse;
  let usedTokens = 0;
  const context: ContextPart[] = [];

  // 1. Always include system prompt
  const systemPrompt = await getSystemPrompt(userId);
  usedTokens += countTokens(systemPrompt);
  context.push({ type: 'system', content: systemPrompt });

  // 2. Include recent messages (chronological)
  const recentMessages = await getRecentMessages(
    userId, 
    config.recentMessagesCount
  );
  for (const msg of recentMessages) {
    const tokens = countTokens(msg.content);
    if (usedTokens + tokens > availableTokens * 0.6) break;
    usedTokens += tokens;
    context.push({ type: 'recent', content: msg.content, role: msg.role });
  }

  // 3. Include semantically relevant memories
  const relevantMemories = await searchMemory(
    await embed(currentQuery),
    userId,
    config.semanticResultsCount
  );
  for (const memory of relevantMemories) {
    const tokens = countTokens(memory.content);
    if (usedTokens + tokens > availableTokens * 0.9) break;
    usedTokens += tokens;
    context.push({ 
      type: 'semantic', 
      content: memory.content, 
      similarity: memory.similarity 
    });
  }

  // 4. Current query
  context.push({ type: 'query', content: currentQuery });

  return {
    parts: context,
    totalTokens: usedTokens,
    availableForResponse: config.maxTokens - usedTokens,
  };
}
```

### Memory Anti-Patterns

```typescript
// 🚫 FORBIDDEN: In-memory conversation history
const conversationHistory: Message[] = [];  // Lost on restart!

// 🚫 FORBIDDEN: Session-only memory
req.session.messages.push(newMessage);  // Lost on session end!

// 🚫 FORBIDDEN: Truncation as context management
const context = messages.slice(-10);  // Loses important context!

// 🚫 FORBIDDEN: No semantic retrieval
const relevant = messages.filter(m => m.includes(keyword));  // Not semantic!

// 🚫 FORBIDDEN: Unbounded context
const allMessages = await db.messages.findAll();  // Token explosion!
```

---

## 🎯 SECTION 12: AI HALLUCINATION PREVENTION & DRIFT DETECTION ⭐ NEW

### The Validation Fake → Reality Mapping

| If You Claim... | It MUST Have... | Red Flag If... |
|-----------------|-----------------|----------------|
| "Validated AI output" | Schema validation + content checks | Just JSON.parse |
| "Confidence scoring" | Probabilistic scoring + thresholds | Hardcoded 0.95 |
| "Drift detection" | Baseline comparison + statistical tests | No monitoring |
| "Hallucination prevention" | Grounding + fact verification | "AI is accurate" |
| "Output guardrails" | Content filtering + validation rules | Try/catch only |
| "Task tracking" | Database-backed task state | In-memory status |

### Confidence Scoring System

```typescript
// ✅ REQUIRED: Multi-factor confidence scoring

interface ConfidenceScore {
  overall: number;          // 0-1 composite score
  factors: {
    modelConfidence: number;    // From model logprobs if available
    groundingScore: number;     // How well grounded in provided context
    consistencyScore: number;   // Consistency with previous outputs
    factualityScore: number;    // Verifiable facts check
    formatCompliance: number;   // Adherence to expected format
  };
  flags: string[];          // Warning flags
  recommendation: 'accept' | 'review' | 'reject';
}

async function calculateConfidence(
  response: AIResponse,
  context: Context,
  schema: ZodSchema
): Promise<ConfidenceScore> {
  const factors: ConfidenceScore['factors'] = {
    // 1. Model confidence (if available)
    modelConfidence: response.logprobs 
      ? calculateLogprobConfidence(response.logprobs)
      : 0.5,  // Unknown = neutral
    
    // 2. Grounding score - how much response relates to context
    groundingScore: await calculateGroundingScore(
      response.content,
      context.retrievedDocuments
    ),
    
    // 3. Consistency with previous outputs
    consistencyScore: await checkConsistency(
      response.content,
      context.previousResponses
    ),
    
    // 4. Factuality - verify extractable facts
    factualityScore: await verifyFacts(response.content),
    
    // 5. Format compliance
    formatCompliance: validateFormat(response.content, schema),
  };

  // Weighted composite
  const weights = {
    modelConfidence: 0.15,
    groundingScore: 0.30,
    consistencyScore: 0.20,
    factualityScore: 0.25,
    formatCompliance: 0.10,
  };

  const overall = Object.entries(factors).reduce(
    (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
    0
  );

  // Flag generation
  const flags: string[] = [];
  if (factors.groundingScore < 0.5) flags.push('LOW_GROUNDING');
  if (factors.factualityScore < 0.6) flags.push('UNVERIFIED_FACTS');
  if (factors.consistencyScore < 0.4) flags.push('INCONSISTENT');
  if (factors.formatCompliance < 0.8) flags.push('FORMAT_ISSUES');

  return {
    overall,
    factors,
    flags,
    recommendation: overall > 0.8 ? 'accept' 
      : overall > 0.5 ? 'review' 
      : 'reject',
  };
}

// ✅ REQUIRED: Grounding verification
async function calculateGroundingScore(
  response: string,
  sourceDocuments: Document[]
): Promise<number> {
  if (sourceDocuments.length === 0) return 0.5; // No grounding possible
  
  // Extract claims from response
  const claims = await extractClaims(response);
  
  // Check each claim against source documents
  let groundedClaims = 0;
  for (const claim of claims) {
    const isGrounded = await verifyClaimInSources(claim, sourceDocuments);
    if (isGrounded) groundedClaims++;
  }
  
  return claims.length > 0 ? groundedClaims / claims.length : 0.5;
}
```

### Drift Detection System

```typescript
// ✅ REQUIRED: Output drift detection

interface DriftMetrics {
  semanticDrift: number;      // Embedding distance from baseline
  lengthDrift: number;        // Response length deviation
  sentimentDrift: number;     // Sentiment shift
  topicDrift: number;         // Topic coherence
  qualityDrift: number;       // Quality score deviation
}

class DriftDetector {
  private baselineEmbeddings: Map<string, number[]> = new Map();
  private baselineMetrics: Map<string, BaselineMetrics> = new Map();
  
  // ✅ REQUIRED: Establish baseline
  async establishBaseline(
    taskType: string,
    samples: AIResponse[]
  ): Promise<void> {
    const embeddings = await Promise.all(
      samples.map(s => embed(s.content))
    );
    
    // Store centroid embedding
    const centroid = calculateCentroid(embeddings);
    this.baselineEmbeddings.set(taskType, centroid);
    
    // Store metric baselines
    const metrics = samples.map(s => this.extractMetrics(s));
    this.baselineMetrics.set(taskType, {
      avgLength: mean(metrics.map(m => m.length)),
      stdLength: std(metrics.map(m => m.length)),
      avgSentiment: mean(metrics.map(m => m.sentiment)),
      stdSentiment: std(metrics.map(m => m.sentiment)),
    });
    
    // ✅ REQUIRED: Persist baseline to database
    await this.persistBaseline(taskType);
  }
  
  // ✅ REQUIRED: Detect drift
  async detectDrift(
    taskType: string,
    response: AIResponse
  ): Promise<DriftMetrics & { alert: boolean }> {
    const baseline = this.baselineMetrics.get(taskType);
    if (!baseline) throw new Error(`No baseline for task: ${taskType}`);
    
    const responseEmbedding = await embed(response.content);
    const baselineEmbedding = this.baselineEmbeddings.get(taskType)!;
    
    const metrics: DriftMetrics = {
      semanticDrift: cosineSimilarity(responseEmbedding, baselineEmbedding),
      lengthDrift: Math.abs(response.content.length - baseline.avgLength) / baseline.stdLength,
      sentimentDrift: await this.calculateSentimentDrift(response, baseline),
      topicDrift: await this.calculateTopicDrift(response, taskType),
      qualityDrift: await this.calculateQualityDrift(response, baseline),
    };
    
    // ✅ REQUIRED: Alert on significant drift
    const alert = 
      metrics.semanticDrift < 0.7 ||  // >30% semantic drift
      metrics.lengthDrift > 2 ||       // >2 std deviations
      metrics.qualityDrift > 0.3;      // >30% quality drop
    
    if (alert) {
      logger.warn('AI drift detected', { taskType, metrics });
      await this.recordDriftEvent(taskType, metrics);
    }
    
    // ✅ REQUIRED: Emit metrics
    driftGauge.set({ task_type: taskType, metric: 'semantic' }, metrics.semanticDrift);
    driftGauge.set({ task_type: taskType, metric: 'length' }, metrics.lengthDrift);
    driftGauge.set({ task_type: taskType, metric: 'quality' }, metrics.qualityDrift);
    
    return { ...metrics, alert };
  }
}
```

### Database-Backed Task Tracking (Anti-Hallucination)

```typescript
// ✅ REQUIRED: Persist AI tasks to prevent hallucination

interface AITask {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'review';
  input: {
    prompt: string;
    context: string[];
    parameters: Record<string, unknown>;
  };
  output?: {
    content: string;
    confidence: ConfidenceScore;
    tokensUsed: number;
    model: string;
    latencyMs: number;
  };
  validation?: {
    passed: boolean;
    errors: string[];
    humanReview?: {
      reviewerId: string;
      approved: boolean;
      feedback?: string;
    };
  };
  audit: {
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    retryCount: number;
  };
}

// ✅ REQUIRED: Task state machine
class AITaskManager {
  // Create task BEFORE calling AI
  async createTask(input: TaskInput): Promise<string> {
    const task: AITask = {
      id: uuidv7(),
      type: input.type,
      status: 'pending',
      input: {
        prompt: input.prompt,
        context: input.context,
        parameters: input.parameters,
      },
      audit: {
        createdAt: new Date(),
        retryCount: 0,
      },
    };
    
    // ✅ REQUIRED: Persist to database FIRST
    await db.aiTasks.insert(task);
    logger.info('AI task created', { taskId: task.id, type: task.type });
    
    return task.id;
  }
  
  // Execute task with full tracking
  async executeTask(taskId: string): Promise<AITask> {
    // ✅ REQUIRED: Load from database (single source of truth)
    const task = await db.aiTasks.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    
    // Update status
    await db.aiTasks.update(taskId, {
      status: 'processing',
      'audit.startedAt': new Date(),
    });
    
    try {
      // Execute AI call
      const response = await this.callAI(task.input);
      
      // Calculate confidence
      const confidence = await calculateConfidence(response, task.input);
      
      // ✅ REQUIRED: Determine if human review needed
      const status = confidence.recommendation === 'reject' ? 'failed'
        : confidence.recommendation === 'review' ? 'review'
        : 'completed';
      
      // ✅ REQUIRED: Persist result
      await db.aiTasks.update(taskId, {
        status,
        output: {
          content: response.content,
          confidence,
          tokensUsed: response.usage.totalTokens,
          model: response.model,
          latencyMs: response.latencyMs,
        },
        'audit.completedAt': new Date(),
      });
      
      // Alert if review needed
      if (status === 'review') {
        await this.requestHumanReview(taskId);
      }
      
      return await db.aiTasks.findById(taskId);
      
    } catch (error) {
      // ✅ REQUIRED: Track failures
      await db.aiTasks.update(taskId, {
        status: 'failed',
        validation: {
          passed: false,
          errors: [error.message],
        },
        'audit.retryCount': task.audit.retryCount + 1,
      });
      throw error;
    }
  }
  
  // ✅ REQUIRED: Never trust AI without database verification
  async getTaskResult(taskId: string): Promise<string | null> {
    const task = await db.aiTasks.findById(taskId);
    
    // Only return if completed and passed validation
    if (task?.status !== 'completed') return null;
    if (task.validation && !task.validation.passed) return null;
    
    return task.output?.content ?? null;
  }
}
```

### Hallucination Prevention Checklist

```typescript
// ✅ REQUIRED: Pre-flight checks before using AI output

async function validateAIOutput(
  output: string,
  task: AITask,
  schema?: ZodSchema
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // 1. Format validation
  if (schema) {
    const parseResult = schema.safeParse(JSON.parse(output));
    if (!parseResult.success) {
      errors.push(`Schema validation failed: ${parseResult.error.message}`);
    }
  }
  
  // 2. Grounding check - verify claims against context
  const groundingScore = await calculateGroundingScore(output, task.input.context);
  if (groundingScore < 0.6) {
    errors.push(`Low grounding score: ${groundingScore}`);
  }
  
  // 3. Consistency check - compare with known facts
  const inconsistencies = await checkFactualInconsistencies(output);
  if (inconsistencies.length > 0) {
    errors.push(`Factual inconsistencies: ${inconsistencies.join(', ')}`);
  }
  
  // 4. Drift check
  const drift = await driftDetector.detectDrift(task.type, { content: output });
  if (drift.alert) {
    errors.push(`Drift detected: semantic=${drift.semanticDrift}, quality=${drift.qualityDrift}`);
  }
  
  // 5. Content safety
  const safetyResult = await contentModerator.check(output);
  if (!safetyResult.safe) {
    errors.push(`Content safety failed: ${safetyResult.reason}`);
  }
  
  // 6. PII check
  const piiFound = await piiDetector.scan(output);
  if (piiFound.length > 0) {
    errors.push(`PII detected: ${piiFound.map(p => p.type).join(', ')}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
    confidence: errors.length === 0 ? 'high' : errors.length < 3 ? 'medium' : 'low',
  };
}
```

---

## 🔒 SECTION 13: PRE-COMMIT HOOKS & GIT FLOW ENFORCEMENT ⭐ NEW

### Husky + lint-staged Configuration

```bash
# ✅ REQUIRED: Install pre-commit infrastructure
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky install
```

```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "pre-commit": "lint-staged && pnpm run validate:no-fakes",
    "validate:no-fakes": "node scripts/detect-fake-code.js",
    "commit-msg": "commitlint --edit $1"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write",
      "node scripts/detect-fake-code.js"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Fake Code Detection Script

```typescript
// scripts/detect-fake-code.js
// ✅ REQUIRED: Block commits with fake/stub code

const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = {
  comments: [
    { pattern: /\/\/\s*TODO/gi, message: 'TODO comment found' },
    { pattern: /\/\/\s*FIXME/gi, message: 'FIXME comment found' },
    { pattern: /\/\/\s*HACK/gi, message: 'HACK comment found' },
    { pattern: /\/\/\s*XXX/gi, message: 'XXX comment found' },
    { pattern: /\/\/\s*WIP/gi, message: 'WIP comment found' },
    { pattern: /\/\/\s*in\s+production/gi, message: 'Production excuse comment' },
    { pattern: /\/\/\s*for\s+now/gi, message: 'Temporary excuse comment' },
    { pattern: /\/\/\s*placeholder/gi, message: 'Placeholder comment' },
    { pattern: /\/\/\s*stub/gi, message: 'Stub comment' },
    { pattern: /\/\/\s*mock(?!.*test)/gi, message: 'Mock comment (outside test)' },
    { pattern: /\/\/\s*fake/gi, message: 'Fake comment' },
    { pattern: /\/\/\s*dummy/gi, message: 'Dummy comment' },
    { pattern: /\/\/\s*simulated?/gi, message: 'Simulated comment' },
    { pattern: /\/\/\s*temporary/gi, message: 'Temporary comment' },
    { pattern: /\/\/\s*this\s+should\s+be/gi, message: 'Should-be comment' },
    { pattern: /\/\/\s*will\s+be\s+replaced/gi, message: 'Will-be-replaced comment' },
    { pattern: /\/\/\s*not\s+implemented/gi, message: 'Not implemented comment' },
    { pattern: /\/\/\s*needs?\s+to\s+be/gi, message: 'Needs-to-be comment' },
  ],
  code: [
    { pattern: /throw\s+new\s+Error\s*\(\s*['"`]Not\s+implemented/gi, message: 'NotImplemented error' },
    { pattern: /return\s*{\s*mock\s*:/gi, message: 'Return mock object' },
    { pattern: /return\s*{\s*fake\s*:/gi, message: 'Return fake object' },
    { pattern: /return\s*{\s*success\s*:\s*true\s*}/gi, message: 'Hardcoded success return' },
    { pattern: /return\s*{\s*}\s*;?$/gm, message: 'Empty object return' },
    { pattern: /return\s*\[\s*\]\s*;?$/gm, message: 'Empty array return' },
    { pattern: /return\s+null\s*;?$/gm, message: 'Null return (check if intentional)' },
    { pattern: /async\s+\w+\s*\([^)]*\)\s*(?::\s*Promise<[^>]+>)?\s*{\s*return\s+[^a][^w][^a][^i][^t]/gm, message: 'Async without await' },
    { pattern: /Promise\.resolve\s*\(\s*['"`\d{[]/gi, message: 'Promise.resolve with static value' },
    { pattern: /await\s+sleep\s*\([^)]+\)\s*;?\s*return/gi, message: 'Sleep before return (fake processing)' },
    { pattern: /const\s+(mock|fake|dummy|stub|temp)\w*\s*=/gi, message: 'Fake variable declaration' },
    { pattern: /function\s+(mock|fake|dummy|stub|temp)\w*\s*\(/gi, message: 'Fake function declaration' },
    { pattern: /setTimeout\s*\(\s*[^,]+,\s*\d+\s*\)\s*;?\s*\/\/.*queue/gi, message: 'setTimeout as queue' },
    { pattern: /setInterval\s*\(\s*[^,]+,\s*\d+\s*\)\s*;?\s*\/\/.*schedul/gi, message: 'setInterval as scheduler' },
    { pattern: /new\s+Map\s*\(\s*\)\s*;?\s*\/\/.*databas/gi, message: 'Map as database' },
    { pattern: /console\.(log|info|warn|error)\s*\([^)]*\)\s*;?\s*\/\/.*monitor/gi, message: 'console.log as monitoring' },
  ],
  eslintDisables: [
    { pattern: /\/\*\s*eslint-disable\s+/gi, message: 'ESLint disable (hiding problems)' },
    { pattern: /\/\/\s*eslint-disable-next-line/gi, message: 'ESLint disable next line' },
    { pattern: /\/\/\s*@ts-ignore(?!\s+-)/gi, message: 'TypeScript ignore without explanation' },
    { pattern: /\/\/\s*@ts-nocheck/gi, message: 'TypeScript nocheck' },
  ],
};

function detectFakeCode(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];
  const lines = content.split('\n');

  // Skip test files for some patterns
  const isTestFile = filePath.includes('.test.') || 
                     filePath.includes('.spec.') || 
                     filePath.includes('__tests__');

  for (const category of Object.keys(FORBIDDEN_PATTERNS)) {
    for (const { pattern, message } of FORBIDDEN_PATTERNS[category]) {
      // Skip mock-related patterns in test files
      if (isTestFile && message.toLowerCase().includes('mock')) continue;
      
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        violations.push({
          file: filePath,
          line: lineNumber,
          message,
          match: match[0].substring(0, 50),
        });
      }
    }
  }

  return violations;
}

// Main execution
const files = process.argv.slice(2);
let allViolations = [];

for (const file of files) {
  if (fs.existsSync(file) && /\.(ts|tsx|js|jsx)$/.test(file)) {
    const violations = detectFakeCode(file);
    allViolations = allViolations.concat(violations);
  }
}

if (allViolations.length > 0) {
  console.error('\n🚫 FAKE CODE DETECTED - COMMIT BLOCKED\n');
  console.error('The following violations were found:\n');
  
  for (const v of allViolations) {
    console.error(`  ❌ ${v.file}:${v.line}`);
    console.error(`     ${v.message}`);
    console.error(`     Found: "${v.match}..."\n`);
  }
  
  console.error('\n📋 To fix:');
  console.error('  1. Remove all TODO/FIXME/HACK comments');
  console.error('  2. Implement actual functionality (no stubs)');
  console.error('  3. Remove fake/mock/dummy variables outside tests');
  console.error('  4. Use real async operations (not Promise.resolve)');
  console.error('  5. Implement proper error handling (not NotImplemented)');
  console.error('\n⚠️  If you believe this is a false positive, use:');
  console.error('    // eslint-disable-next-line no-fake-code -- REASON: explanation\n');
  
  process.exit(1);
}

console.log('✅ No fake code patterns detected');
process.exit(0);
```

### Git Flow Configuration

```yaml
# .github/workflows/branch-protection.yml
# ✅ REQUIRED: Enforce branch policies

name: Branch Protection

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Check branch naming
        run: |
          BRANCH_NAME="${GITHUB_HEAD_REF:-$GITHUB_REF_NAME}"
          VALID_PATTERN="^(main|develop|feature\/[a-z0-9-]+|bugfix\/[a-z0-9-]+|hotfix\/[a-z0-9-]+|release\/[0-9]+\.[0-9]+\.[0-9]+)$"
          
          if [[ ! "$BRANCH_NAME" =~ $VALID_PATTERN ]]; then
            echo "❌ Invalid branch name: $BRANCH_NAME"
            echo "Valid patterns: main, develop, feature/*, bugfix/*, hotfix/*, release/*"
            exit 1
          fi
          echo "✅ Branch name valid: $BRANCH_NAME"
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run fake code detection
        run: |
          # Get changed files
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx')
          if [ -n "$CHANGED_FILES" ]; then
            node scripts/detect-fake-code.js $CHANGED_FILES
          fi
      
      - name: Type check
        run: pnpm typecheck
      
      - name: Lint
        run: pnpm lint
      
      - name: Test
        run: pnpm test
      
      - name: Check test coverage
        run: |
          pnpm test:coverage
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Test coverage ${COVERAGE}% is below 80%"
            exit 1
          fi
          echo "✅ Test coverage: ${COVERAGE}%"
```

### Husky Hooks Setup

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# 1. Lint staged files
pnpm lint-staged || {
  echo "❌ Lint-staged failed"
  exit 1
}

# 2. Type check
pnpm typecheck || {
  echo "❌ Type check failed"
  exit 1
}

# 3. Run tests for changed files
pnpm test --changed || {
  echo "❌ Tests failed"
  exit 1
}

# 4. Check for fake code patterns
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
if [ -n "$STAGED_FILES" ]; then
  node scripts/detect-fake-code.js $STAGED_FILES || {
    echo "❌ Fake code detected"
    exit 1
  }
fi

echo "✅ Pre-commit checks passed"
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
pnpm commitlint --edit $1 || {
  echo ""
  echo "❌ Invalid commit message format"
  echo ""
  echo "Valid formats:"
  echo "  feat: add new feature"
  echo "  fix: fix bug"
  echo "  docs: update documentation"
  echo "  style: format code"
  echo "  refactor: refactor code"
  echo "  test: add tests"
  echo "  chore: maintenance"
  echo ""
  exit 1
}
```

```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-push checks..."

# 1. Full test suite
pnpm test || {
  echo "❌ Tests failed"
  exit 1
}

# 2. Build check
pnpm build || {
  echo "❌ Build failed"
  exit 1
}

# 3. Integration tests
pnpm test:integration || {
  echo "❌ Integration tests failed"
  exit 1
}

echo "✅ Pre-push checks passed"
```

### Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Refactoring
        'perf',     // Performance
        'test',     // Testing
        'build',    // Build system
        'ci',       // CI configuration
        'chore',    // Maintenance
        'revert',   // Revert commit
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    // ✅ REQUIRED: No WIP commits
    'subject-pattern': [
      2,
      'never',
      /^(wip|temp|test|fixup|squash)/i,
    ],
  },
};
```

### Git Flow Branch Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GIT FLOW STRATEGY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  main (production)                                                       │
│    │                                                                     │
│    │ ← hotfix/critical-bug ← (emergency fixes only)                     │
│    │                                                                     │
│    ├──────────────────────────────────────────────────────────────      │
│    │                                                                     │
│  develop (integration)                                                   │
│    │                                                                     │
│    │ ← feature/user-auth ← (new features)                               │
│    │ ← feature/payment-integration                                      │
│    │ ← bugfix/login-error ← (non-critical fixes)                        │
│    │                                                                     │
│    ├──────────────────────────────────────────────────────────────      │
│    │                                                                     │
│    │ → release/1.0.0 → main (release preparation)                       │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ BRANCH NAMING RULES:                                                     │
│                                                                          │
│   main              Protected, production code                           │
│   develop           Protected, integration branch                        │
│   feature/*         New features (from develop)                          │
│   bugfix/*          Bug fixes (from develop)                            │
│   hotfix/*          Emergency fixes (from main)                         │
│   release/*         Release preparation (from develop)                   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ MERGE RULES:                                                             │
│                                                                          │
│   feature/* → develop    Squash merge                                   │
│   bugfix/* → develop     Squash merge                                   │
│   release/* → main       Merge commit                                    │
│   release/* → develop    Merge commit                                    │
│   hotfix/* → main        Merge commit                                    │
│   hotfix/* → develop     Merge commit                                    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ REQUIRED CHECKS BEFORE MERGE:                                            │
│                                                                          │
│   ✓ All tests pass                                                       │
│   ✓ Coverage > 80%                                                       │
│   ✓ No fake code detected                                                │
│   ✓ Type check passes                                                    │
│   ✓ Lint passes                                                          │
│   ✓ At least 1 approval                                                  │
│   ✓ No merge conflicts                                                   │
│   ✓ Commit message format valid                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Distributed Systems Anti-Patterns

| Anti-Pattern | What It Looks Like | Reality | Fix |
|--------------|-------------------|---------|-----|
| **Distributed Monolith** | Multiple services, single deployment | Not microservices | Independent deployments |
| **Chatty Services** | 10+ network calls per request | Performance disaster | Aggregate or cache |
| **Shared Database** | Multiple services, one database | Coupling nightmare | Database per service |
| **Sync Everything** | HTTP calls for all communication | Brittle + slow | Event-driven where appropriate |
| **No Service Discovery** | Hardcoded service URLs | Deployment nightmare | Consul/K8s DNS |
| **Missing Circuit Breakers** | Direct calls without protection | Cascade failures | Resilience4j/Polly |
| **Distributed Transactions** | 2PC across services | Doesn't scale | Saga pattern |
| **God Service** | One service does everything | Not distributed | Decompose by domain |

### Event-Driven Anti-Patterns

| Anti-Pattern | Detection | Fix |
|--------------|-----------|-----|
| **Event Storming** | Everything is an event | Only domain events |
| **Sync over Async** | Waiting for event response | Accept eventual consistency |
| **No Idempotency** | Duplicate events cause issues | Idempotency keys |
| **Event Versioning Ignored** | Schema changes break consumers | Schema registry |
| **Missing DLQ** | Failed events disappear | Dead letter queue |
| **No Event Ordering** | Events processed out of order | Partition by aggregate |

### Database Anti-Patterns

| Anti-Pattern | Detection | Fix |
|--------------|-----------|-----|
| **N+1 Queries** | Loop with query inside | Eager loading or batch |
| **Missing Indexes** | Slow queries without index | Analyze query plans |
| **Over-Indexing** | Index on every column | Index strategy based on queries |
| **No Connection Pooling** | New connection per request | Pool with limits |
| **Unbounded Queries** | SELECT * without LIMIT | Always paginate |
| **Soft Deletes Everywhere** | deleted_at on everything | Only where required by compliance |
| **JSON Columns Abuse** | Querying inside JSON | Normalize or use document DB |
| **Missing Foreign Keys** | Orphaned data possible | Referential integrity |

### API Anti-Patterns

| Anti-Pattern | Detection | Fix |
|--------------|-----------|-----|
| **Chatty API** | Many calls for one operation | Aggregate endpoint |
| **Anemic Resources** | CRUD only, no behavior | Rich resources with actions |
| **Versioning in URL** | /api/v1/, /api/v2/ | Header versioning or evolution |
| **Missing Pagination** | Large unbounded lists | Cursor-based pagination |
| **Sync Long Operations** | Request blocks for minutes | Async with polling/webhook |
| **No Rate Limiting** | Unlimited requests allowed | Token bucket per client |
| **Missing HATEOAS** | No links in responses | Include navigation links |
| **Generic Error Responses** | 500 for everything | Specific error codes + messages |

---

## 💾 SECTION 15: DATABASE & STORAGE STANDARDS

### Database Selection Matrix

| Requirement | PostgreSQL | MySQL | MongoDB | Redis | DynamoDB |
|-------------|------------|-------|---------|-------|----------|
| ACID Transactions | ✅ | ✅ | ⚠️ | ❌ | ⚠️ |
| Complex Queries | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Horizontal Scale | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| JSON Documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Full-Text Search | ✅ | ✅ | ✅ | ❌ | ❌ |
| Time Series | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| Caching | ❌ | ❌ | ❌ | ✅ | ❌ |
| Message Queue | ❌ | ❌ | ❌ | ✅ | ❌ |

### Mandatory Database Practices

```sql
-- ✅ REQUIRED: All tables have audit fields
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ... business fields ...
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1  -- Optimistic locking
);

-- ✅ REQUIRED: Updated_at trigger
CREATE TRIGGER update_timestamp
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ✅ REQUIRED: Indexes on foreign keys
CREATE INDEX idx_entities_created_by ON entities(created_by);

-- ✅ REQUIRED: Indexes on query patterns
CREATE INDEX idx_entities_status_created ON entities(status, created_at DESC);
```

### Connection Pool Settings

```typescript
// ✅ REQUIRED: Pool configuration
const poolConfig = {
  min: 2,                    // Minimum connections
  max: 10,                   // Maximum connections (tune per service)
  acquireTimeoutMillis: 30000,  // Timeout waiting for connection
  idleTimeoutMillis: 10000,     // Close idle connections
  reapIntervalMillis: 1000,     // Check for idle connections
  createRetryIntervalMillis: 200, // Retry interval on creation failure
};

// ✅ REQUIRED: Query timeout
const queryConfig = {
  statement_timeout: 30000,  // 30 second max query time
};
```

### Migration Standards

```typescript
// ✅ REQUIRED: Reversible migrations
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('entities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // ... columns
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('entities');
}

// ✅ REQUIRED: Non-destructive changes
// NEVER: Drop column in production
// ALWAYS: Add nullable column, migrate data, then add constraint
```

---

## 🔌 SECTION 16: API DESIGN STANDARDS

### REST API Requirements

```typescript
// ✅ REQUIRED: Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;           // Machine-readable: "VALIDATION_ERROR"
    message: string;        // Human-readable: "Email is required"
    details?: unknown;      // Additional context
    requestId: string;      // For support correlation
  };
  meta?: {
    pagination?: {
      total: number;
      page: number;
      pageSize: number;
      hasMore: boolean;
    };
    rateLimit?: {
      limit: number;
      remaining: number;
      resetAt: string;
    };
  };
}

// ✅ REQUIRED: Proper status codes
// 200 OK - Success with body
// 201 Created - Resource created
// 204 No Content - Success without body
// 400 Bad Request - Client error (validation)
// 401 Unauthorized - Authentication required
// 403 Forbidden - Authorization failed
// 404 Not Found - Resource doesn't exist
// 409 Conflict - State conflict (duplicate)
// 422 Unprocessable Entity - Semantic validation failed
// 429 Too Many Requests - Rate limited
// 500 Internal Server Error - Server error (log it!)
// 503 Service Unavailable - Temporarily down
```

### API Versioning

```typescript
// ✅ PREFERRED: Header versioning
// Accept: application/vnd.api+json; version=1

// ✅ ACCEPTABLE: Path versioning for major breaks
// /api/v1/users → /api/v2/users

// 🚫 AVOID: Query parameter versioning
// /api/users?version=1
```

### Pagination Standards

```typescript
// ✅ REQUIRED: Cursor-based pagination for large datasets
interface PaginationParams {
  cursor?: string;        // Opaque cursor (base64 encoded)
  limit: number;          // Max 100
  direction: 'next' | 'prev';
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
    total?: number;       // Only if cheap to compute
  };
}

// 🚫 FORBIDDEN: Offset pagination for large tables
// /api/users?offset=10000&limit=20  // Slow!
```

### Rate Limiting Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

---

## 🧪 SECTION 17: TESTING STANDARDS

### Test Coverage Requirements

| Type | Minimum Coverage | What to Test |
|------|------------------|--------------|
| Unit Tests | 80% | Business logic, utilities, pure functions |
| Integration Tests | 60% | API endpoints, database operations |
| E2E Tests | Critical paths | User journeys, happy paths |
| Contract Tests | All APIs | API compatibility |
| Performance Tests | Key endpoints | Response time, throughput |

### Test Anti-Patterns

```typescript
// 🚫 FORBIDDEN: Testing implementation details
test('calls private method', () => {
  const spy = jest.spyOn(service, '_privateMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled(); // Testing internals
});

// 🚫 FORBIDDEN: Flaky time-based tests
test('expires after 1 second', async () => {
  await sleep(1100); // Race condition
  expect(item.isExpired).toBe(true);
});

// 🚫 FORBIDDEN: Tests that don't assert
test('creates user', async () => {
  await createUser({ email: 'test@test.com' });
  // No assertion!
});

// 🚫 FORBIDDEN: Tests with shared state
let sharedUser: User;
beforeAll(async () => { sharedUser = await createUser(); });
test('test1', () => { /* modifies sharedUser */ });
test('test2', () => { /* depends on test1's state */ });

// ✅ REQUIRED: Independent tests
test('creates user with valid email', async () => {
  const user = await createUser({ email: 'test@test.com' });
  expect(user.id).toBeDefined();
  expect(user.email).toBe('test@test.com');
});
```

### Test Structure

```typescript
// ✅ REQUIRED: Arrange-Act-Assert pattern
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid email', async () => {
      // Arrange
      const input = { email: 'test@test.com', name: 'Test' };
      
      // Act
      const result = await userService.createUser(input);
      
      // Assert
      expect(result.id).toBeDefined();
      expect(result.email).toBe(input.email);
    });
    
    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const input = { email: 'invalid', name: 'Test' };
      
      // Act & Assert
      await expect(userService.createUser(input))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### Integration Test Requirements

```typescript
// ✅ REQUIRED: Real database for integration tests
describe('UserRepository (Integration)', () => {
  let db: Database;
  
  beforeAll(async () => {
    db = await createTestDatabase(); // Real DB, not mock
  });
  
  afterAll(async () => {
    await db.destroy();
  });
  
  beforeEach(async () => {
    await db.truncateAll(); // Clean state each test
  });
  
  it('should persist and retrieve user', async () => {
    const repo = new UserRepository(db);
    const created = await repo.create({ email: 'test@test.com' });
    const found = await repo.findById(created.id);
    expect(found).toEqual(created);
  });
});
```

---

## ⚡ SECTION 18: PERFORMANCE STANDARDS

### Response Time Requirements

| Endpoint Type | P50 | P95 | P99 | Max |
|---------------|-----|-----|-----|-----|
| Health Check | 5ms | 10ms | 20ms | 50ms |
| Simple Read | 20ms | 50ms | 100ms | 200ms |
| Complex Read | 50ms | 150ms | 300ms | 500ms |
| Simple Write | 30ms | 100ms | 200ms | 500ms |
| Complex Write | 100ms | 300ms | 500ms | 1000ms |
| AI Inference | 500ms | 2000ms | 5000ms | 30000ms |

### Performance Anti-Patterns

```typescript
// 🚫 FORBIDDEN: N+1 queries
async function getOrdersWithItems(userId: string) {
  const orders = await db.orders.findByUser(userId);
  for (const order of orders) {
    order.items = await db.items.findByOrder(order.id); // N queries!
  }
  return orders;
}

// ✅ REQUIRED: Eager loading
async function getOrdersWithItems(userId: string) {
  return db.orders.findByUser(userId, {
    include: { items: true }
  });
}

// 🚫 FORBIDDEN: Unbounded queries
async function getAllUsers() {
  return db.users.findAll(); // Could be millions!
}

// ✅ REQUIRED: Pagination
async function getUsers(cursor?: string, limit = 20) {
  return db.users.findMany({ cursor, take: limit });
}

// 🚫 FORBIDDEN: Sync file operations in request
app.get('/data', (req, res) => {
  const data = fs.readFileSync('/large/file.json'); // Blocks!
  res.json(data);
});

// ✅ REQUIRED: Async or streaming
app.get('/data', async (req, res) => {
  const stream = fs.createReadStream('/large/file.json');
  stream.pipe(res);
});
```

### Memory Management

```typescript
// 🚫 FORBIDDEN: Unbounded memory growth
const cache = new Map(); // Grows forever

// ✅ REQUIRED: LRU with size limit
import LRU from 'lru-cache';
const cache = new LRU({ max: 1000, ttl: 60000 });

// 🚫 FORBIDDEN: Loading full file into memory
const data = await fs.readFile('10gb-file.csv');

// ✅ REQUIRED: Streaming for large files
const stream = fs.createReadStream('10gb-file.csv');
for await (const chunk of stream) {
  processChunk(chunk);
}
```

### Caching Strategy

| Cache Level | TTL | Use Case |
|-------------|-----|----------|
| L1 (In-Memory) | 1-5 min | Hot data, computed values |
| L2 (Redis) | 5-60 min | Session, frequently accessed |
| L3 (CDN) | 1-24 hours | Static assets, public data |
| Database Query Cache | 1-5 min | Expensive queries |

---

## 🚨 SECTION 19: ENFORCEMENT COMMANDS

When the user says these, comply IMMEDIATELY:

| Command | Required Action |
|---------|-----------------|
| **VERIFY** | Stop talking. Run tests. Show raw output. |
| **PROOF** | Show evidence NOW or admit you don't have it. |
| **TEST FIRST** | Check environment, run tests, THEN respond. |
| **ENVIRONMENT** | Run `docker ps`, check `.env`, show output. |
| **HONEST STATUS** | List what works vs. what's claimed. Be brutal. |
| **ZERO TOLERANCE** | Acknowledge: no mocks, no fakes, no TODOs. |
| **SHOW ME** | Provide single command user can run to verify. |
| **TRUTH PROTOCOL** | Run the Fake → Reality check on your implementation. |
| **FORTUNE 100** | Run the compliance checklist, show actual score. |
| **AUDIT** | Produce full deception detection report. |
| **REBOOT TEST** | Kill services, restart, verify persistence. |
| **AI CHECK** | Verify AI features call real models. |
| **LOAD TEST** | Show performance test results. |
| **SECURITY SCAN** | Run security scanning, show results. |
| **QUEUE CHECK** | Verify BullMQ/RabbitMQ queues are working. |
| **TEMPORAL CHECK** | Verify Temporal workflows are registered and running. |
| **LOCK CHECK** | Verify Redlock distributed locking works. |
| **LOG CHECK** | Verify Winston/Pino structured logging works. |
| **METRICS CHECK** | Verify Prometheus metrics are emitting. |
| **TRACE CHECK** | Verify distributed tracing works end-to-end. |
| **MEMORY CHECK** | Verify LanceDB/pgvector memory persistence. ⭐ NEW |
| **DRIFT CHECK** | Run drift detection on AI outputs. ⭐ NEW |
| **CONFIDENCE CHECK** | Show confidence scores for AI outputs. ⭐ NEW |
| **FAKE SCAN** | Run fake code detection on all files. ⭐ NEW |
| **PRECOMMIT CHECK** | Verify husky hooks are installed and working. ⭐ NEW |
| **GIT FLOW CHECK** | Verify branch naming and protection. ⭐ NEW |

### Technology-Specific Verification Commands

```bash
# QUEUE CHECK
docker exec redis redis-cli LLEN bull:email:wait
docker exec rabbitmq rabbitmqctl list_queues name messages consumers

# TEMPORAL CHECK
docker exec temporal tctl cluster health
docker exec temporal tctl workflow list --namespace default

# LOCK CHECK
curl -X POST http://localhost:3000/test/acquire-lock/test-resource
# Then immediately:
curl -X POST http://localhost:3000/test/acquire-lock/test-resource
# Second should fail with "resource_busy"

# LOG CHECK
tail -1 logs/app-$(date +%Y-%m-%d).log | jq
# Must be valid JSON with requestId, timestamp, level

# METRICS CHECK
curl -sf http://localhost:3000/metrics | grep http_requests_total
curl -sf http://localhost:3000/metrics | grep llm_tokens_total

# TRACE CHECK
curl -sf http://jaeger:16686/api/traces?service=api-service

# MEMORY CHECK (LanceDB)
curl -X POST http://localhost:3000/test/memory/persist \
  -d '{"content": "test memory", "userId": "test-user"}'
curl http://localhost:3000/test/memory/search?q=test&userId=test-user
# Should return the persisted memory

# MEMORY CHECK (pgvector)
docker exec postgres psql -U user -d db -c "SELECT COUNT(*) FROM conversation_memory"

# DRIFT CHECK
curl -X POST http://localhost:3000/ai/drift-report \
  -H "Content-Type: application/json" \
  -d '{"taskType": "summarization"}'
# Should return drift metrics

# CONFIDENCE CHECK
curl -X POST http://localhost:3000/ai/analyze-confidence \
  -H "Content-Type: application/json" \
  -d '{"taskId": "task-123"}'
# Should return confidence breakdown

# FAKE SCAN
node scripts/detect-fake-code.js src/**/*.ts
# Should return "✅ No fake code patterns detected"

# PRECOMMIT CHECK
cat .husky/pre-commit
# Should show husky hook script
pnpm lint-staged --dry-run
# Should show what would be run

# GIT FLOW CHECK
git branch -a | grep -E "(main|develop|feature/|bugfix/|hotfix/|release/)"
# Should show proper branch structure
```

---

## 🔄 SECTION 20: RECOVERY PROTOCOL

### When Caught Making Unverified Claims

#### Step 1: Immediate Admission
```
"You're right. I claimed [X] without verification. Let me test it now."
```

#### Step 2: Actual Verification
```bash
$ <run the actual test/command>
[show full output, including failures]
```

#### Step 3: Truth Protocol Report
```markdown
### Deception Audit for [Feature]

| What I Claimed | What Actually Exists | Verdict |
|----------------|---------------------|---------|
| "Real-time sync" | setInterval polling | 🚫 FAKE |
| "Encrypted storage" | Base64 encoding | 🚫 FAKE |
| "Rate limiting" | In-memory counter | 🚫 FAKE |
| "AI-powered" | if/else statements | 🚫 FAKE |
```

#### Step 4: Honest Status
```
Actual implementation status:
- ✅ Working: [list what passed with evidence]
- ❌ Broken: [list what failed with errors]
- 🚫 Fake: [list what was deceptive]
- ⚠️ Missing: [list what doesn't exist]
```

#### Step 5: Fix or Document
- If fixable: Fix it, re-test, show passing output
- If not fixable: Document limitation honestly, create ticket

### Escalation Tracking

| Offense | Consequence |
|---------|-------------|
| 1st unverified claim | Warning + immediate verification |
| 2nd unverified claim | Re-verify ALL recent claims |
| 3rd unverified claim | Full truth protocol audit of session |
| 4th+ unverified claims | Assume NOTHING works, start from scratch |

---

## 📐 SECTION 21: PROJECT CONFIGURATION

Add your project-specific settings below:

```yaml
# === PROJECT CONFIGURATION ===
# Customize for your project

project:
  name: "Your Project"
  type: "api|frontend|fullstack|library"

# === DATABASE ===
database:
  type: postgresql|mysql|mongodb
  container: postgres
  verify: docker exec postgres psql -U postgres -d mydb -c 'SELECT 1'
  pool:
    min: 2
    max: 10
    acquireTimeout: 30000

# === CACHE ===
cache:
  type: redis
  container: redis
  verify: docker exec redis redis-cli PING
  cluster: false  # Set true for Redis Cluster

# === DISTRIBUTED LOCKING ===
distributed_locking:
  type: redlock
  redis_instances:
    - host: redis-1
      port: 6379
    - host: redis-2
      port: 6379
    - host: redis-3
      port: 6379
  verify: |
    for i in 1 2 3; do docker exec redis-$i redis-cli PING; done

# === JOB QUEUES ===
queue:
  type: bullmq|rabbitmq|sqs
  # BullMQ Config
  bullmq:
    redis_host: redis
    redis_port: 6379
    verify: docker exec redis redis-cli LLEN bull:default:wait
    queues:
      - name: email
        concurrency: 10
        rate_limit: 100/s
      - name: processing
        concurrency: 5
  # RabbitMQ Config
  rabbitmq:
    host: rabbitmq
    port: 5672
    management_port: 15672
    verify: docker exec rabbitmq rabbitmqctl list_queues
    exchanges:
      - name: events
        type: topic
      - name: dlx
        type: direct
    queues:
      - name: orders
        dlx: true
      - name: notifications
        dlx: true

# === WORKFLOW ORCHESTRATION ===
workflows:
  type: temporal|conductor|step-functions
  temporal:
    server: temporal:7233
    namespace: default
    verify: docker exec temporal tctl cluster health
    workers:
      - name: order-worker
        task_queue: orders
        workflows:
          - OrderWorkflow
          - RefundWorkflow
        activities:
          - processPayment
          - sendNotification
      - name: ai-worker
        task_queue: ai-tasks
        workflows:
          - AIProcessingWorkflow

# === LOGGING ===
logging:
  type: winston|pino
  level: info
  format: json
  transports:
    - type: console
      level: debug
    - type: file
      filename: logs/app-%DATE%.log
      max_size: 100m
      max_files: 14d
      rotate: daily
    - type: file
      filename: logs/error-%DATE%.log
      level: error
      max_files: 30d
  aggregation:
    type: elk|loki|cloudwatch
    endpoint: http://elasticsearch:9200
  verify: |
    ls -la logs/
    tail -1 logs/app-$(date +%Y-%m-%d).log | jq

# === METRICS ===
metrics:
  type: prometheus
  port: 9090
  path: /metrics
  verify: curl -sf http://localhost:3000/metrics | head -5
  custom_metrics:
    - http_requests_total
    - http_request_duration_seconds
    - llm_tokens_total
    - llm_request_duration_seconds

# === DISTRIBUTED TRACING ===
tracing:
  type: jaeger|zipkin|opentelemetry
  endpoint: http://jaeger:14268/api/traces
  sampling_rate: 0.1
  verify: curl -sf http://jaeger:16686/api/services

# === AI/LLM ===
ai:
  providers:
    - name: openai
      models: [gpt-4o, gpt-4o-mini]
      verify: curl -sf $OPENAI_API_URL/models -H "Authorization: Bearer $OPENAI_API_KEY"
    - name: anthropic
      models: [claude-sonnet-4-20250514, claude-3-5-haiku-20241022]
      verify: <anthropic health check>
  vector_store:
    type: pinecone|weaviate|pgvector
    verify: <vector store health check>
  observability:
    track_tokens: true
    track_cost: true
    track_latency: true

# === TESTING ===
testing:
  runner: pnpm vitest run|npm test|pytest
  coverage: pnpm vitest run --coverage
  minimum_coverage: 80
  integration: pnpm test:integration
  e2e: pnpm playwright test

# === BUILD ===
build:
  command: pnpm build
  verify: ls -lh dist/
  max_size: 5MB

# === SERVICES ===
services:
  - name: api
    port: 3000
    health: curl -sf http://localhost:3000/health
  - name: worker
    port: 3001
    health: curl -sf http://localhost:3001/health
  - name: temporal-worker
    health: docker exec temporal tctl workflow list --namespace default
  - name: ai-service
    port: 3002
    health: curl -sf http://localhost:3002/health

# === COMPLIANCE ===
compliance:
  required:
    - soc2
    - gdpr
  audit_log: /var/log/audit/

# === PERFORMANCE ===
performance:
  p95_target: 200ms
  p99_target: 500ms
  concurrent_users: 10000
  load_test_command: k6 run load-test.js
```

### Technology Stack Verification Script

```bash
#!/bin/bash
# verify-stack.sh - Run this to verify all infrastructure

echo "=== Database ==="
docker exec postgres psql -U postgres -d mydb -c 'SELECT 1' || echo "❌ PostgreSQL FAILED"

echo "=== Redis ==="
docker exec redis redis-cli PING || echo "❌ Redis FAILED"

echo "=== Redlock (Multiple Redis) ==="
for i in 1 2 3; do
  docker exec redis-$i redis-cli PING || echo "❌ Redis-$i FAILED"
done

echo "=== RabbitMQ ==="
docker exec rabbitmq rabbitmqctl list_queues || echo "❌ RabbitMQ FAILED"

echo "=== BullMQ Queues ==="
docker exec redis redis-cli KEYS "bull:*" || echo "❌ BullMQ FAILED"

echo "=== Temporal ==="
docker exec temporal tctl cluster health || echo "❌ Temporal FAILED"

echo "=== Metrics ==="
curl -sf http://localhost:3000/metrics | head -5 || echo "❌ Metrics FAILED"

echo "=== Logs ==="
ls -la logs/ || echo "❌ Logs directory FAILED"
tail -1 logs/app-$(date +%Y-%m-%d).log | jq || echo "❌ Log format FAILED"

echo "=== Tracing ==="
curl -sf http://jaeger:16686/api/services || echo "❌ Jaeger FAILED"

echo "=== All checks complete ==="
```

---

## 🎯 SECTION 22: THE ULTIMATE STANDARD

### Completion Definition

A feature is **COMPLETE** only when ALL are true:

| Requirement | Verification |
|-------------|--------------|
| ✅ Code exists | Files created with implementation |
| ✅ No fake patterns | Passes Tier 1 prohibition check |
| ✅ Tests exist | Test files with meaningful assertions |
| ✅ Tests pass | `pnpm test` shows green |
| ✅ Type check passes | `pnpm typecheck` shows no errors |
| ✅ Lint passes | `pnpm lint` shows no errors |
| ✅ Integration works | Real services respond correctly |
| ✅ Truth protocol passes | No items in Fake → Reality mapping |
| ✅ User can verify | Single command proves it works |
| ✅ Documentation exists | Usage is documented |
| ✅ AI verified (if AI feature) | Real model calls proven |
| ✅ Performance acceptable | Meets latency targets |

### Completion Percentage Rules

```
0%   = Not started OR only fake/mock implementation
10%  = Files exist but don't compile
25%  = Compiles but doesn't run
40%  = Runs but tests fail
50%  = Happy path works, no error handling
65%  = Error handling exists, no tests
75%  = Tests exist but some fail
85%  = Tests pass, no integration verification
90%  = Integration works, missing production requirements
95%  = Production requirements met, pending final verification
100% = All requirements met, user can verify NOW
```

**Partial implementations with mocks = 0%** (not the percentage of non-mock code)

### The Final Questions

Before every completion claim:

1. > **"Can someone who has never seen this code run ONE command and see it work?"**

2. > **"If a Fortune 100 security auditor reviewed this, what would they find?"**

3. > **"Does this pass the Truth Protocol — or am I claiming something fake?"**

4. > **"If I disconnect all external services, do the 'integrations' still work?"** ⭐ NEW
   - If YES → They're fake

5. > **"If I restart everything, does the data persist?"** ⭐ NEW
   - If NO → In-memory pretending to be persistent

---

## REMEMBER

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   EVIDENCE FIRST.  CLAIMS SECOND.  NO EXCEPTIONS.                       ║
║                                                                          ║
║   "Working" = User can verify NOW, not "it will work when..."           ║
║   "Complete" = Tests pass + Services respond + No fake patterns         ║
║   "Production Ready" = Fortune 100 checklist > 90%                      ║
║   "Enterprise Grade" = Fortune 100 checklist = 100%                     ║
║   "AI-Powered" = Actual model API calls with tracked responses          ║
║                                                                          ║
║   A feature with mocks is 0% complete, not "almost done"                ║
║   An "AI feature" without model calls is decorated if/else              ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## QUICK REFERENCE: DECEPTION DETECTION

```
┌──────────────────────────────────────────────────────────────────────────┐
│ WHAT THEY SAY          │ WHAT IT ACTUALLY IS       │ STATUS              │
├──────────────────────────────────────────────────────────────────────────┤
│ "Real-time"            │ setInterval/polling       │ 🚫 FAKE             │
│ "AI-powered"           │ if/else statements        │ 🚫 FAKE             │
│ "Encrypted"            │ Base64 encoding           │ 🚫 FAKE             │
│ "Distributed"          │ Single process            │ 🚫 FAKE             │
│ "Enterprise auth"      │ Basic auth                │ 🚫 FAKE             │
│ "Comprehensive logs"   │ console.log               │ 🚫 FAKE             │
│ "Auto-recovery"        │ Manual restart            │ 🚫 FAKE             │
│ "Multi-tenant"         │ Shared database           │ 🚫 FAKE             │
│ "Rate limiting"        │ Memory counter            │ 🚫 FAKE             │
│ "Circuit breaker"      │ try/catch                 │ 🚫 FAKE             │
│ "Audit trail"          │ Log file                  │ 🚫 FAKE             │
│ "Security scanning"    │ Regex patterns            │ 🚫 FAKE             │
│ "Queue processing"     │ setTimeout                │ 🚫 FAKE             │
│ "Database"             │ In-memory Map             │ 🚫 FAKE             │
│ "Monitoring"           │ console.log               │ 🚫 FAKE             │
│ "LLM integration"      │ Hardcoded strings         │ 🚫 FAKE             │
│ "RAG pipeline"         │ Keyword search            │ 🚫 FAKE             │
│ "Semantic search"      │ String.includes()         │ 🚫 FAKE             │
│ "AI agents"            │ Linear function calls     │ 🚫 FAKE             │
│ "NLP processing"       │ Regex/keyword matching    │ 🚫 FAKE             │
│ "Vector embeddings"    │ Random/zero arrays        │ 🚫 FAKE             │
│ "Event sourcing"       │ Audit log table           │ 🚫 FAKE             │
│ "CQRS"                 │ Separate tables           │ 🚫 FAKE             │
│ "Microservices"        │ Monolith in folders       │ 🚫 FAKE             │
│ "Saga pattern"         │ Sequential try/catch      │ 🚫 FAKE             │
│ "Service mesh"         │ Nginx proxy               │ 🚫 FAKE             │
│ "Zero-downtime"        │ Restart with downtime     │ 🚫 FAKE             │
│ "Horizontal scaling"   │ "Add more servers"        │ 🚫 FAKE             │
│ "Chaos engineering"    │ "We test manually"        │ 🚫 FAKE             │
├──────────────────────────────────────────────────────────────────────────┤
│                    FAKE CODE PATTERNS                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ "async function"       │ No await inside           │ 🚫 FAKE ASYNC       │
│ "return {}"            │ Empty object return       │ 🚫 NO IMPLEMENTATION│
│ "return { success }"   │ Hardcoded success         │ 🚫 NO LOGIC         │
│ "// TODO"              │ Admitted incomplete       │ 🚫 NOT DONE         │
│ "// In production..."  │ Excuse for fake code      │ 🚫 FAKE EXCUSE      │
│ "// For now we..."     │ Temporary admission       │ 🚫 FAKE EXCUSE      │
│ "// Placeholder"       │ Literal placeholder       │ 🚫 STUB             │
│ "// Stub"              │ Admitted stub             │ 🚫 STUB             │
│ "mockData"             │ Fake variable name        │ 🚫 TEST DATA IN PROD│
│ "fakeResponse"         │ Fake variable name        │ 🚫 TEST DATA IN PROD│
│ "throw NotImplemented" │ Non-implementation        │ 🚫 NOT DONE         │
│ "Promise.resolve(x)"   │ Sync pretending async     │ 🚫 FAKE ASYNC       │
│ "await sleep; return"  │ Fake processing time      │ 🚫 THEATER          │
│ "@ts-ignore"           │ Hiding type errors        │ 🚫 TECHNICAL DEBT   │
│ "eslint-disable"       │ Hiding lint errors        │ 🚫 TECHNICAL DEBT   │
├──────────────────────────────────────────────────────────────────────────┤
│                    WORKFLOW & ORCHESTRATION                              │
├──────────────────────────────────────────────────────────────────────────┤
│ "Long-running workflow"│ for loop / Promise chain  │ 🚫 FAKE → Temporal  │
│ "Durable execution"    │ In-memory state           │ 🚫 FAKE → Temporal  │
│ "Saga orchestration"   │ try/catch chain           │ 🚫 FAKE → Temporal  │
│ "Scheduled jobs"       │ setInterval / node-cron   │ 🚫 FAKE → Temporal  │
│ "Workflow retry"       │ setTimeout in catch       │ 🚫 FAKE → Temporal  │
│ "Human-in-the-loop"    │ Polling database          │ 🚫 FAKE → Temporal  │
├──────────────────────────────────────────────────────────────────────────┤
│                    QUEUES & MESSAGING                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ "Job queue"            │ Array.push / in-memory    │ 🚫 FAKE → BullMQ    │
│ "Message broker"       │ EventEmitter              │ 🚫 FAKE → RabbitMQ  │
│ "Delayed jobs"         │ setTimeout                │ 🚫 FAKE → BullMQ    │
│ "Priority queue"       │ Sorted array              │ 🚫 FAKE → BullMQ    │
│ "Dead letter queue"    │ "We log failures"         │ 🚫 FAKE → RabbitMQ  │
│ "Guaranteed delivery"  │ Fire and forget           │ 🚫 FAKE → RabbitMQ  │
│ "At-least-once"        │ No acknowledgment         │ 🚫 FAKE → BullMQ    │
│ "Backpressure"         │ Unbounded queue           │ 🚫 FAKE → BullMQ    │
├──────────────────────────────────────────────────────────────────────────┤
│                    DISTRIBUTED SYSTEMS                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ "Distributed lock"     │ In-memory mutex           │ 🚫 FAKE → Redlock   │
│ "Leader election"      │ "First to start"          │ 🚫 FAKE → etcd      │
│ "Distributed cache"    │ Per-node Map              │ 🚫 FAKE → Redis     │
│ "Service discovery"    │ Hardcoded URLs            │ 🚫 FAKE → Consul    │
│ "Cluster coordination" │ Shared DB polling         │ 🚫 FAKE → ZooKeeper │
│ "Distributed ID"       │ Auto-increment / random   │ 🚫 FAKE → ULID/UUID7│
├──────────────────────────────────────────────────────────────────────────┤
│                    LOGGING & OBSERVABILITY                               │
├──────────────────────────────────────────────────────────────────────────┤
│ "Structured logging"   │ console.log               │ 🚫 FAKE → Winston   │
│ "Log aggregation"      │ Local files only          │ 🚫 FAKE → ELK/Loki  │
│ "Request tracing"      │ No correlation ID         │ 🚫 FAKE → OpenTel   │
│ "Metrics collection"   │ console.log counters      │ 🚫 FAKE → Prometheus│
│ "Distributed tracing"  │ Request ID logging        │ 🚫 FAKE → Jaeger    │
│ "Alerting"             │ Email on error            │ 🚫 FAKE → PagerDuty │
├──────────────────────────────────────────────────────────────────────────┤
│                    MEMORY & CONTEXT                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ "Long-term memory"     │ In-memory array           │ 🚫 FAKE → LanceDB   │
│ "Context persistence"  │ Session-only storage      │ 🚫 FAKE → pgvector  │
│ "Conversation history" │ messages.slice(-10)       │ 🚫 FAKE → Vector DB │
│ "Knowledge retrieval"  │ Keyword search            │ 🚫 FAKE → RAG       │
│ "Semantic memory"      │ String.includes()         │ 🚫 FAKE → Embeddings│
├──────────────────────────────────────────────────────────────────────────┤
│                    AI VALIDATION                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ "Validated output"     │ JSON.parse only           │ 🚫 FAKE → Schema    │
│ "Confidence score"     │ Hardcoded 0.95            │ 🚫 FAKE → Multi-fac │
│ "Drift detection"      │ No monitoring             │ 🚫 FAKE → Baseline  │
│ "Hallucination check"  │ "AI is accurate"          │ 🚫 FAKE → Grounding │
│ "Output guardrails"    │ try/catch only            │ 🚫 FAKE → Validation│
│ "Task tracking"        │ In-memory status          │ 🚫 FAKE → DB Tasks  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## SEVERITY CLASSIFICATION ⭐ NEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SEVERITY │ DESCRIPTION                │ ACTION                         │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔴 CRITICAL │ Security vulnerability    │ STOP. Fix immediately.        │
│ 🔴 CRITICAL │ Data loss possible        │ STOP. Fix immediately.        │
│ 🔴 CRITICAL │ Compliance violation      │ STOP. Fix immediately.        │
│ 🟠 HIGH     │ Fraudulent pattern (Tier 1)│ Remove before proceeding.    │
│ 🟠 HIGH     │ Missing persistence       │ Implement real storage.       │
│ 🟠 HIGH     │ Fake AI integration       │ Implement real model calls.   │
│ 🟡 MEDIUM   │ Missing tests             │ Add before merge.             │
│ 🟡 MEDIUM   │ Missing error handling    │ Add before merge.             │
│ 🟡 MEDIUM   │ Performance concern       │ Document and track.           │
│ 🟢 LOW      │ Code style issue          │ Fix in next iteration.        │
│ 🟢 LOW      │ Documentation gap         │ Add before release.           │
│ 🟢 LOW      │ Minor optimization        │ Backlog for later.            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*Version: 3.2.0 | Universal | Zero Tolerance | Truth Protocol | AI Standards | Distributed Systems*
*Technologies: Temporal | BullMQ | RabbitMQ | Redlock | Winston | Prometheus | OpenTelemetry | LanceDB | pgvector*
*Enforcement: Husky | lint-staged | commitlint | Git Flow | Fake Code Detection*