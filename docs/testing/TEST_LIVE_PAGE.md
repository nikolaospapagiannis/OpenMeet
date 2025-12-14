# Testing Live Transcription Page

## Quick Test Guide

### Step 1: Start Services

```bash
# Terminal 1: API Server
cd /home/user/openmeet/apps/api
pnpm dev

# Terminal 2: Web Server
cd /home/user/openmeet/apps/web
pnpm dev

# Wait for both to start
# API should be on: http://localhost:3001
# Web should be on: http://localhost:3000
```

### Step 2: Create a Live Session

```bash
# Create a test live session via API
curl -X POST http://localhost:3001/api/live/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "meetingId": "test-meeting-id",
    "language": "en"
  }'

# Response will include sessionId
# Example: {"success": true, "liveSession": {"id": "abc-123-..."}}
```

### Step 3: Access Live Page

```
Open browser to:
http://localhost:3000/live/{sessionId}

Replace {sessionId} with the ID from Step 2
```

### Step 4: Verify WebSocket Connection

**Open Browser DevTools (F12)**

1. Go to **Network** tab
2. Filter by **WS** (WebSocket)
3. You should see a connection to `ws://localhost:3002`
4. Click on the connection
5. Go to **Messages** tab
6. You should see Socket.io handshake messages

Example messages:
```json
// Outgoing
{"type":"live:join","data":{"sessionId":"abc-123-..."}}

// Incoming
{"type":"transcript:segment","data":{"id":"seg-1","speaker":"John","text":"Hello"}}
```

### Step 5: Test Features

#### A. View Connection Status
- Look for green dot with "Live" text in header
- If disconnected, should show red dot with "Disconnected" and reconnect button

#### B. Test Auto-Scroll
1. Wait for transcript segments to appear
2. Manually scroll up in the transcript panel
3. Verify "New messages" button appears at bottom
4. Click button to scroll back to bottom
5. Verify auto-scroll resumes

#### C. Test Bookmark Creation (Keyboard Shortcut)
1. Press the **'B'** key on your keyboard
2. Bookmark dialog should open
3. Enter a title (e.g., "Important moment")
4. Select a type (e.g., "Action Item")
5. Add tags: type "follow-up" and press Enter
6. Click "Create Bookmark"
7. Dialog closes and bookmark appears in recent bookmarks

#### D. Test Search
1. In transcript panel, type in search box
2. Matching segments should highlight in yellow
3. Speaker names also searchable
4. Clear search to remove highlights

#### E. Test Participants
- Initially may show 0 participants
- When others join, count should increase
- Speaking indicator (green pulse) should appear next to active speaker
- Talk time bars should update in real-time

#### F. Test Session Controls

**Pause/Resume:**
1. Click "Pause" button
2. Status should change to "paused"
3. Timer should stop
4. Click "Resume"
5. Status returns to "active"
6. Timer resumes

**Share Link:**
1. Click "Share" button
2. Dialog shows shareable link
3. Click "Copy" button
4. Link copied to clipboard
5. Should show ✓ confirmation

**End Session:**
1. Click "End" button (red)
2. Confirmation dialog appears
3. Click "End Session" to confirm
4. Should redirect to meeting details page

### Step 6: Test Mobile View

```bash
# Open DevTools
# Toggle device toolbar (Ctrl+Shift+M)
# Select iPhone or Android device
```

Verify:
- Layout stacks vertically
- Buttons are touch-friendly
- Dialogs go full-screen
- Scrolling works smoothly
- Keyboard shortcuts still work

### Step 7: Test Dark Mode

```bash
# In browser
# Open DevTools > Rendering > Emulate CSS media feature
# Select: prefers-color-scheme: dark
```

Verify:
- All components use dark backgrounds
- Text is readable with proper contrast
- Animations still visible
- No color issues

---

## Test Scenarios

### Scenario 1: New User Joins Mid-Session

**Setup:**
1. Open live page in Browser 1
2. Open same session in Browser 2

**Expected:**
- Browser 1 sees participant count increase
- Browser 2 sees existing transcript history
- Both browsers receive new segments simultaneously

### Scenario 2: Network Disconnect

**Setup:**
1. Open live page
2. In DevTools Network tab, toggle "Offline"

**Expected:**
- Connection status changes to "Disconnected"
- Red indicator appears
- Reconnect button shows
- Toggle back online and click reconnect
- Connection restores
- Missed segments sync from server

### Scenario 3: Create Bookmark from Another Tab

**Setup:**
1. Open live page in Tab 1
2. Open same session in Tab 2
3. In Tab 2, press 'B' and create bookmark

**Expected:**
- Tab 1 receives bookmark via WebSocket
- Bookmark appears in recent bookmarks
- Both tabs show same bookmark count

### Scenario 4: Long Session (Performance)

**Setup:**
1. Simulate 1000+ transcript segments
2. Scroll to top
3. Search for a term

**Expected:**
- Page remains responsive
- Search completes quickly
- No memory leaks
- Smooth scrolling

---

## Debugging

### WebSocket Not Connecting

**Check:**
```bash
# Is API running?
curl http://localhost:3001/health

# Is WebSocket port open?
lsof -i :3002

# Check environment variable
echo $NEXT_PUBLIC_WS_URL
```

**Fix:**
- Ensure API server is running
- Check `NEXT_PUBLIC_WS_URL` in `.env.local`
- Verify firewall not blocking port 3002

### Transcript Not Updating

**Check:**
1. Open DevTools Console
2. Look for WebSocket errors
3. Check Network tab for failed API calls

**Fix:**
- Verify session ID is valid
- Check user authentication token
- Ensure session status is 'active'

### Bookmarks Not Saving

**Check:**
```bash
# Test API directly
curl -X POST http://localhost:3001/api/live/{sessionId}/bookmarks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","timestampSeconds":0}'
```

**Fix:**
- Verify authentication
- Check database connection
- Review API logs

---

## Performance Metrics

### Expected Performance:

| Metric | Target | Measurement |
|--------|--------|-------------|
| WebSocket Latency | < 100ms | DevTools Network WS tab |
| Transcript Render | < 50ms | React DevTools Profiler |
| Scroll FPS | 60 FPS | DevTools Performance tab |
| Memory Usage | < 200MB | DevTools Memory tab |
| Bundle Size | < 1MB | Next.js build output |

### Monitoring:

```bash
# Build for production
cd apps/web
pnpm build

# Check bundle sizes
ls -lh .next/static/chunks/

# Analyze bundle
pnpm analyze
```

---

## Common Issues

### Issue: "Session not found"
**Cause:** Invalid session ID or session expired
**Fix:** Create new session or check session status in database

### Issue: Blank transcript panel
**Cause:** No transcript data received yet
**Fix:** Wait for server to send segments, or check WebSocket messages

### Issue: Bookmarks not appearing
**Cause:** WebSocket event not received
**Fix:** Check WebSocket connection, verify event listeners attached

### Issue: Participants not updating
**Cause:** `user:joined` events not firing
**Fix:** Verify API emits events when users join session

### Issue: Auto-scroll not working
**Cause:** Scroll state not updating
**Fix:** Check `isScrolledToBottom` state in hook

---

## Success Criteria

✅ All features implemented
✅ No TypeScript errors
✅ WebSocket connects successfully
✅ Transcript updates in real-time
✅ Participants tracked accurately
✅ Bookmarks create and sync
✅ Session controls work
✅ Mobile responsive
✅ Dark mode supported
✅ Keyboard shortcuts functional
✅ No console errors
✅ Performance within targets

---

## Next Steps

After testing:

1. **Load Testing:** Use Artillery or k6 to simulate multiple users
2. **E2E Testing:** Add Playwright tests for user journeys
3. **Monitoring:** Set up Sentry for error tracking
4. **Analytics:** Add event tracking for user actions
5. **Documentation:** Update user-facing docs with screenshots

---

## Evidence Collection

For verification report, collect:

1. **Screenshot:** Live page with transcript
2. **Screenshot:** WebSocket messages in DevTools
3. **Screenshot:** Bookmark creation dialog
4. **Screenshot:** Participants list with speaking indicator
5. **Video:** Full user journey from join to end session
6. **Logs:** API logs showing session creation
7. **Database:** Query showing live session data

```sql
-- Example verification query
SELECT * FROM "LiveSession" WHERE id = 'your-session-id';
SELECT COUNT(*) FROM "LiveTranscriptSegment" WHERE "liveSessionId" = 'your-session-id';
SELECT * FROM "LiveBookmark" WHERE "liveSessionId" = 'your-session-id';
```

---

## Contact

For issues or questions about the live transcription implementation:
- Check `/home/user/openmeet/LIVE_TRANSCRIPTION_IMPLEMENTATION.md`
- Review `/home/user/openmeet/LIVE_PAGE_STRUCTURE.txt`
- Inspect component source code in `/apps/web/src/components/live/`
