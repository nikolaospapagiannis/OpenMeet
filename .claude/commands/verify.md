# Verify Command

When user types `/verify`, you MUST:

1. **Stop what you're doing**
2. **Run tests for what you just claimed**
3. **Show the actual output**
4. **Admit if it doesn't work**

## Response Template:

```
Running verification...

Environment Check:
[docker ps / service status / etc.]

Test Execution:
[actual test command and output]

Results:
✅ X tests passed
❌ Y tests failed

Evidence:
[database queries / service checks / actual proof]

Honest Status:
[what actually works vs what was claimed]
```

## No Excuses Allowed:

❌ "Tests would pass if..."
❌ "It should work because..."
❌ "The error shows that..."

✅ "Tests passed: [output]"
✅ "Tests failed: [error]"
✅ "Service is down, fixing now"
