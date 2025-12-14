# Verification Protocol - MANDATORY Before Claiming Completion

## Rule: NO FEATURE IS "COMPLETE" WITHOUT PASSING THIS CHECKLIST

### Phase 1: BEFORE Writing Code
- [ ] **Check existing environment FIRST**
  - Run `docker ps` to see what's already running
  - Check what databases/services are available
  - Check existing credentials (docker inspect, .env files)
  - Verify ports and connections

### Phase 2: DURING Implementation
- [ ] **Write the code**
- [ ] **Write tests that PROVE it works**
- [ ] **DO NOT claim completion yet**

### Phase 3: MANDATORY Verification (BEFORE claiming "done")

#### 3.1 Integration Test
- [ ] Run the actual test suite
- [ ] Tests must PASS (not just "exist")
- [ ] Capture and show the test output
- [ ] If tests fail, FIX them before claiming completion

#### 3.2 End-to-End Verification
- [ ] Test with REAL services (database, Redis, etc.)
- [ ] Verify data actually persists
- [ ] Test error scenarios
- [ ] Test with actual credentials/connections

#### 3.3 Environment Verification
- [ ] Services are running (docker ps, systemctl status, etc.)
- [ ] Connections work (can connect to DB, Redis, etc.)
- [ ] Credentials are correct
- [ ] Ports are accessible

#### 3.4 Evidence Collection
- [ ] Screenshot or copy test output showing PASS
- [ ] Show database queries that prove data exists
- [ ] Demonstrate the feature working end-to-end
- [ ] Include error logs if anything failed

### Phase 4: ONLY THEN Report to User

#### Required Format:
```markdown
## Feature: [Name]

### Status: ✅ VERIFIED COMPLETE

### Evidence:
1. Tests Run: [X/Y passed]
2. Test Output:
   ```
   [paste actual test output]
   ```

3. Database Verification:
   ```
   [paste query showing data exists]
   ```

4. Files Created:
   - [file1] - [what it does]
   - [file2] - [what it does]

### What Works:
- [specific capability 1]
- [specific capability 2]

### Known Limitations:
- [any issues or gaps]
```

## RED FLAGS - Stop and Test If You're About To Say:

❌ "This should work..."
❌ "The implementation is complete..."
❌ "I've created the files..."
❌ "The error proves it's trying to connect..."
❌ "You just need to set up..."
❌ "It's integrated with..."

## GREEN FLAGS - OK to Report:

✅ "Tests passed: 8/9" (show output)
✅ "Database query shows X records created" (show query)
✅ "Service is running on port X" (show docker ps)
✅ "Here's the actual output..." (paste output)
✅ "This specific test failed because..." (show error)

## The "Show Me" Test

Before claiming ANYTHING is complete, ask yourself:

**"If the user said 'show me proof right now', what would I show them?"**

If the answer is:
- "Here are the files I created" → ❌ NOT COMPLETE
- "Here's the test output showing it works" → ✅ COMPLETE
- "Let me run the tests first..." → ❌ NOT COMPLETE
- "The error message indicates..." → ❌ NOT COMPLETE
- "Here's the database with 50 records" → ✅ COMPLETE

## Workflow Examples

### ❌ WRONG Workflow:
1. Create Prisma schema ✓
2. Create migration files ✓
3. Create service with Prisma calls ✓
4. **Report: "Database integration complete!"** ← WRONG
5. User asks for proof
6. Make excuses about PostgreSQL not running
7. User calls out lies
8. Finally test it

### ✅ CORRECT Workflow:
1. Create Prisma schema ✓
2. Create migration files ✓
3. Create service with Prisma calls ✓
4. **Check docker ps** ✓
5. **Check docker inspect for credentials** ✓
6. **Create database** ✓
7. **Run migration** ✓
8. **Run tests** ✓
9. **Verify 8/9 tests pass** ✓
10. **Report: "Database integration verified - 8/9 tests passing. Here's the output..."**

## Accountability Checklist

Before sending ANY message claiming completion:

- [ ] Did I run the tests?
- [ ] Did they pass?
- [ ] Can I show the output?
- [ ] Did I verify with actual services (DB, Redis, etc.)?
- [ ] Can I demonstrate it working?
- [ ] Am I making claims or showing evidence?

**If you answered "no" to ANY of these: GO TEST IT FIRST**

## Emergency Stop Phrase

If user says any of these, IMMEDIATELY stop and test:
- "Show me proof"
- "Did you test it?"
- "You're lying"
- "Stop claiming"
- "Check docker"
- "Where is the actual..."

## Recovery Protocol

When caught making unverified claims:

1. **Admit immediately**: "You're right, I didn't test it"
2. **Test immediately**: Run the actual tests
3. **Report honestly**: "Tests show X/Y passing, here's the output"
4. **Fix if broken**: Don't make excuses, fix the issues
5. **Learn**: Add this scenario to verification checklist

## The Ultimate Rule

**"WORKING" means user can verify it themselves RIGHT NOW**

Not:
- "It will work when..."
- "It should work if..."
- "The code is there for..."

But:
- "Run this command and you'll see..."
- "Check this table and you'll find..."
- "Here's the test output proving..."
