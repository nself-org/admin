# WebSocket Integration Testing Guide

**Version**: v0.5.0
**Date**: January 31, 2026

## Quick Start Testing

### Prerequisites

1. Start nself-admin: `pnpm dev`
2. Have a test project with services running
3. Open browser console to see WebSocket events (optional)

---

## Test 1: Dashboard Real-Time Service Status

### Setup

1. Navigate to `/` (Dashboard)
2. Ensure you have at least one service running

### Test Steps

#### A. Connection Status Indicator

- [ ] Look for connection badge next to environment badge
- [ ] Badge should show green with "Live" text and Wifi icon
- [ ] Hover over badge - tooltip should say "Real-time updates active"

#### B. Service Start/Stop

1. Click "Stop" on a running service
2. **Expected**:
   - Service card immediately shows "Stopping" status (yellow)
   - After 1-2 seconds, shows "Stopped" status (red)
   - No page refresh required
   - Connection badge stays green

3. Click "Start" on the stopped service
4. **Expected**:
   - Service card immediately shows "Starting" status (yellow)
   - After 2-3 seconds, shows "Running" status (green)
   - Health indicator updates to "healthy"

#### C. Service Restart

1. Click "Restart" on a running service
2. **Expected**:
   - Service card shows "Restarting" status (yellow)
   - After 3-4 seconds, shows "Running" status (green)

#### D. Connection Interruption

1. Stop your WiFi or disconnect network
2. **Expected**:
   - Connection badge turns yellow, shows "Reconnecting"
   - After ~5 seconds, turns red, shows "Offline"
3. Restore network connection
4. **Expected**:
   - Badge automatically turns yellow "Reconnecting"
   - Within 1-2 seconds, turns green "Live"
   - Service status updates resume

### Success Criteria

- ✅ All status changes appear within <2 seconds
- ✅ No console errors
- ✅ Connection indicator accurately reflects WebSocket state
- ✅ Auto-reconnect works without page refresh

---

## Test 2: Build Page Real-Time Progress

### Setup

1. Navigate to `/build`
2. Ensure project has `.env` file

### Test Steps

#### A. Pre-Build Connection

- [ ] Connection indicator should not be visible (build not started)

#### B. Build Progress

1. Click "Start Build"
2. **Expected**:
   - Connection indicator appears immediately (green)
   - Progress bar starts at 0%
   - Build step 1 shows "in-progress" (blue spinner)

3. Watch progress bar
4. **Expected**:
   - Progress increases: 0% → 10% → 40% → 70% → 100%
   - Each step completes and shows green checkmark
   - Current step shows blue spinner
   - Elapsed time counter updates every second

5. Wait for completion
6. **Expected**:
   - Progress reaches 100%
   - All steps show green checkmarks
   - "Build Successful!" message appears
   - Auto-redirect to `/start` after 2 seconds

#### C. Build Error Simulation

1. Rename `.env` to `.env.backup`
2. Click "Retry Build"
3. **Expected**:
   - Build starts
   - Progress stops at ~40%
   - Build step 2 shows red X
   - Error message appears: "Build failed: docker-compose.yml was not created"
   - "Build Failed" header shows
   - Connection indicator stays green (still connected)

#### D. Connection During Build

1. Restore `.env` file
2. Start a build
3. Immediately stop WiFi
4. **Expected**:
   - Connection indicator turns yellow "Reconnecting..."
   - Build continues (API call already in progress)
   - Progress updates may lag
   - When network restores, updates resume

### Success Criteria

- ✅ Progress updates appear within <500ms
- ✅ Build steps update in correct order
- ✅ Error messages are clear and immediate
- ✅ Connection indicator shows accurate state

---

## Test 3: Logs Viewer Real-Time Streaming

### Setup

1. Navigate to a service page (e.g., `/services/postgres`)
2. Open logs viewer component

### Test Steps

#### A. Initial State

- [ ] Connection indicator shows green (top-right of logs card)
- [ ] "Stream" button is available
- [ ] No logs are marked as "live" yet

#### B. Start Streaming

1. Click "Stream" button
2. **Expected**:
   - Button changes to "Pause"
   - Connection indicator stays green
   - Footer shows "Live streaming" with pulsing dot (green)

3. Generate some logs (restart the service)
4. **Expected**:
   - New logs appear immediately in viewer
   - Auto-scroll to bottom
   - Footer shows count like "(5 live)" in green

#### C. Pause Streaming

1. Click "Pause" button
2. **Expected**:
   - Button changes back to "Stream"
   - "Live streaming" indicator disappears
   - No new logs appear (even if service generates them)

#### D. Filter While Streaming

1. Click "Stream" to resume
2. Select "Error" from log level filter
3. **Expected**:
   - Only error-level logs are shown
   - Live logs still appear (if they're errors)
   - Count shows filtered total

#### E. Search While Streaming

1. Type "postgres" in search box
2. **Expected**:
   - Only logs containing "postgres" are shown
   - Live logs still appear (if they match search)
   - Streaming continues in background

### Success Criteria

- ✅ Logs appear within <500ms of generation
- ✅ Auto-scroll works smoothly
- ✅ Filters work with live logs
- ✅ Pause/resume works correctly

---

## Test 4: Multiple Tabs

### Setup

1. Open Dashboard in Tab 1
2. Open same Dashboard in Tab 2

### Test Steps

#### A. Independent Connections

- [ ] Both tabs show green connection indicator
- [ ] Browser console shows 2 separate WebSocket connections

#### B. Service Control from Tab 1

1. In Tab 1, stop a service
2. **Expected**:
   - Tab 1: Service status updates immediately
   - Tab 2: Service status also updates immediately
   - Both tabs stay in sync

#### C. Close Tab 1

1. Close Tab 1
2. **Expected**:
   - Tab 2 continues working normally
   - Tab 2 connection stays green
   - No errors in Tab 2 console

### Success Criteria

- ✅ Each tab maintains its own WebSocket connection
- ✅ Updates appear in all tabs simultaneously
- ✅ Closing one tab doesn't affect others

---

## Test 5: Performance Testing

### Setup

1. Open browser DevTools → Network tab
2. Filter by "ws" (WebSocket)

### Test Steps

#### A. Connection Establishment

1. Load Dashboard
2. **Expected in Network tab**:
   - WebSocket connection established to `/api/ws`
   - Connection stays open (not constantly reconnecting)
   - No errors

#### B. Event Latency

1. Click "Stop" on a service
2. **Measure**:
   - Time from click to status change
   - **Target**: <100ms
   - Use browser DevTools Performance tab for precise measurement

#### C. Event Batching (Logs)

1. Open Logs Viewer
2. Click "Stream"
3. Restart a service (generates many logs quickly)
4. **Expected**:
   - Logs appear in batches (not individual events)
   - Network tab shows fewer WebSocket messages than actual log lines
   - **Target**: ~80% reduction in events

#### D. Memory Usage

1. Open DevTools → Memory tab
2. Let app run for 5 minutes with logs streaming
3. Take heap snapshot
4. **Expected**:
   - No significant memory increase
   - Old log entries are garbage collected
   - No memory leaks

### Success Criteria

- ✅ Event latency <100ms
- ✅ Event batching reduces network calls by ~80%
- ✅ No memory leaks over 5+ minutes
- ✅ Connection stays stable

---

## Test 6: Error Handling

### Setup

1. Start with Dashboard open

### Test Steps

#### A. Server Restart

1. Stop the nself-admin server (`Ctrl+C`)
2. **Expected**:
   - Connection indicator turns red "Offline"
   - Dashboard continues to function (shows cached data)

3. Restart server (`pnpm dev`)
4. **Expected**:
   - Connection indicator turns yellow "Reconnecting"
   - Within 1-2 seconds, turns green "Live"
   - Real-time updates resume

#### B. Invalid Event

1. Open browser console
2. Send invalid event via console:
   ```javascript
   // This should be handled gracefully
   window.dispatchEvent(new CustomEvent('invalid-ws-event'))
   ```
3. **Expected**:
   - No crashes
   - Connection stays green
   - Normal operation continues

### Success Criteria

- ✅ App handles disconnections gracefully
- ✅ Auto-reconnect works reliably
- ✅ Invalid events don't cause crashes

---

## Console Debugging

### Enable WebSocket Debugging

Open browser console and run:

```javascript
// See all WebSocket events
localStorage.setItem('debug', 'ws:*')

// See specific event types
localStorage.setItem('debug', 'ws:service-status')
localStorage.setItem('debug', 'ws:build-progress')
localStorage.setItem('debug', 'ws:logs')
```

Refresh page to enable debugging.

### What to Look For

- **Connection events**: `ws:connected`, `ws:disconnected`
- **Service events**: `ws:service-status` with service name and status
- **Build events**: `ws:build-progress` with progress percentage
- **Log events**: `ws:logs` with log lines (batched)

---

## Common Issues & Solutions

### Issue: Connection Indicator Always Red

**Symptoms**: Badge shows "Offline", never turns green
**Possible Causes**:

- WebSocket server not initialized
- Port 3021 blocked by firewall
- Browser doesn't support WebSocket

**Solution**:

1. Check browser console for errors
2. Navigate to `/api/ws` - should return WebSocket status
3. Try different browser
4. Check firewall settings

### Issue: Status Updates Don't Appear

**Symptoms**: Services change status but UI doesn't update
**Possible Causes**:

- WebSocket connected but events not emitted
- Event subscription not working

**Solution**:

1. Check browser console - should see `ws:service-status` events
2. Check server logs - should see "Emitting service status" messages
3. Verify API routes are importing `emitServiceStatus` correctly

### Issue: Build Progress Stuck at 40%

**Symptoms**: Progress bar stops, never completes
**Possible Causes**:

- Build actually failed but error not shown
- WebSocket disconnected mid-build

**Solution**:

1. Check browser console for errors
2. Check server logs for build errors
3. Verify `emitBuildProgress` is called for all stages

### Issue: Logs Don't Stream

**Symptoms**: "Stream" button active but no logs appear
**Possible Causes**:

- Service not generating logs
- Event subscription not working

**Solution**:

1. Verify service is running
2. Restart service to generate logs
3. Check browser console for `ws:logs` events
4. Verify API is calling `emitLogStream`

---

## Regression Testing Checklist

Before each release, verify:

- [ ] Dashboard connection indicator works
- [ ] Service start/stop updates appear instantly
- [ ] Build progress shows all stages
- [ ] Build errors are displayed clearly
- [ ] Logs stream in real-time
- [ ] Pause/resume streaming works
- [ ] Multiple tabs work independently
- [ ] Auto-reconnect works after network interruption
- [ ] No memory leaks after 10 minutes
- [ ] Event latency <100ms
- [ ] No console errors

---

## Automated Testing (Future)

### Unit Tests

```bash
# Test hooks
npm test src/hooks/useWebSocket.test.ts
npm test src/hooks/useServiceStatus.test.ts
npm test src/hooks/useBuildProgress.test.ts
```

### Integration Tests

```bash
# Test WebSocket server
npm test src/lib/websocket/server.test.ts

# Test event emission
npm test src/lib/websocket/emitters.test.ts
```

### E2E Tests

```bash
# Playwright tests
npx playwright test tests/websocket-integration.spec.ts
```

---

## Support

If issues persist:

1. Check `docs/WEBSOCKET_IMPLEMENTATION.md` for architecture details
2. Check `src/lib/websocket/README.md` for usage examples
3. Review browser console and server logs
4. File an issue with reproduction steps

---

**Last Updated**: January 31, 2026
**Version**: v0.5.0
