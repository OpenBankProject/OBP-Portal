# Opey Debugging Guide

This guide helps you diagnose and fix issues where messages are not coming back properly from Opey.

## Quick Start - Enable Debug Mode

### Method 1: URL Parameter
Add `?opey_debug=true` to your URL:
```
http://localhost:5173/?opey_debug=true
```

### Method 2: Browser Console
Open browser console and run:
```javascript
window.opeyDebug.enable()
```

### Method 3: LocalStorage
Set the debug flag directly:
```javascript
localStorage.setItem('opey_debug_enabled', 'true')
localStorage.setItem('opey_debug_monitor', 'true')
```

## Common Issues and Solutions

### 1. Messages Not Appearing

**Symptoms:**
- User sends message but no response appears
- Loading indicators persist indefinitely
- Chat appears frozen

**Debugging Steps:**
1. Enable debug mode and check the debug monitor
2. Look for stream events in the event log
3. Check browser network tab for failed requests
4. Run the debug script: `npm run debug:opey`

**Common Causes:**
- Network connectivity issues
- Opey service not responding
- Streaming connection interrupted
- Authentication problems

### 2. Messages Getting Removed/Summarized

**Symptoms:**
- Messages disappear after being displayed
- Conversation history gets truncated
- RemoveMessage operations in logs

**Debugging Steps:**
1. Check Opey logs for conversation summarization activity
2. Monitor the debug console for RemoveMessage events
3. Look for `conversation_summary` operations
4. Check message persistence with multiple test messages

**Solutions:**
- Adjust Opey's conversation summarization settings
- Increase message retention limits
- Review cleanup policies

### 3. Streaming Connection Issues

**Symptoms:**
- Partial messages received
- Stream cuts out mid-response
- Tool calls not completing

**Debugging Steps:**
1. Monitor network connections in browser dev tools
2. Check for Server-Sent Events (SSE) errors
3. Look for timeout issues in debug logs
4. Test streaming endpoint directly

**Solutions:**
- Increase timeout values
- Check proxy/load balancer configurations
- Verify SSE support in infrastructure

## Debug Tools

### 1. Debug Monitor
Visual overlay showing real-time message and connection stats.

**Features:**
- Message counts and status
- Connection health
- Event log with timestamps
- Export functionality

**Usage:**
```javascript
// Show/hide monitor
window.opeyDebug.toggleMonitor()

// Change position
localStorage.setItem('opey_monitor_position', 'top-left')
```

### 2. Debug Script
Standalone Node.js script for testing Opey connectivity.

**Run:**
```bash
npm run debug:opey
```

**Features:**
- Health check testing
- Authentication verification
- Streaming endpoint testing
- Message persistence testing

### 3. Enhanced Logging
Detailed console logging for all Opey operations.

**Log Levels:**
- `debug`: All operations and data
- `info`: Important events and status
- `warn`: Potential issues
- `error`: Failures only

**Set log level:**
```javascript
window.opeyDebug.setLogLevel('debug')
```

## Diagnostic Procedures

### Basic Connectivity Test
```javascript
// In browser console
fetch('/api/opey/auth', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

### Stream Test
```javascript
// Test streaming endpoint
fetch('http://localhost:5000/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'test', stream_tokens: true })
})
```

### Message Flow Analysis
1. Enable debug mode
2. Send a test message
3. Watch the debug monitor event log
4. Look for the complete flow:
   - `assistant_start`
   - `assistant_token` (multiple)
   - `assistant_complete`

## Configuration Files

### Debug Configuration
File: `src/lib/opey/debug-config.ts`

Key settings:
```typescript
{
  enabled: true,              // Enable debug mode
  showDebugMonitor: true,     // Show visual monitor
  logLevel: 'debug',          // Logging detail level
  enableStreamLogging: true,  // Log stream events
  maxLogEntries: 100         // Monitor log size
}
```

### Environment Variables
```bash
# Opey service URL
OPEY_BASE_URL="http://localhost:5000"
PUBLIC_OPEY_BASE_URL="http://localhost:5000"

# Enable debug mode via environment
OPEY_DEBUG_ENABLED=true
```

## Troubleshooting Checklist

### Before Debugging
- [ ] Opey service is running and accessible
- [ ] Network connectivity is working
- [ ] Authentication is properly configured
- [ ] Browser supports Server-Sent Events

### During Debugging
- [ ] Debug mode is enabled
- [ ] Debug monitor is visible
- [ ] Console logs are being generated
- [ ] Network tab shows requests/responses

### Data Collection
- [ ] Export debug data from monitor
- [ ] Copy console logs
- [ ] Note exact error messages
- [ ] Record reproduction steps

## Log Analysis

### Key Log Patterns

**Healthy Message Flow:**
```
[OPEY INFO] Sending message with threadId=abc123
[RestChatService] Processing stream event: assistant_start
[RestChatService] Processing stream event: assistant_token
[RestChatService] Processing stream event: assistant_complete
[ChatController] Marking assistant message as complete
```

**Problem Indicators:**
```
[RestChatService] Stream appears to have stalled
[RestChatService] Network error during fetch
[ChatState] Ignoring stale message from previous session
[RestChatService] Failed to parse event data
```

### Opey Server Logs
Look for these patterns in Opey logs:

**Message Removal:**
```
RemoveMessage operations
conversation_summary activity
SQLite checkpoint operations
```

**Connection Issues:**
```
Stream connection errors
Timeout errors
Authentication failures
```

## Performance Monitoring

### Response Times
Monitor average response times in debug monitor:
- Normal: < 2000ms
- Slow: 2000-5000ms
- Problem: > 5000ms

### Event Frequency
Healthy chat should show:
- Regular `assistant_token` events
- Completion events for all messages
- No stale message warnings

## Advanced Debugging

### Custom Event Listeners
```javascript
// Listen to all stream events
chatController.service.onStreamEvent((event) => {
  console.log('Stream Event:', event);
});

// Listen to state changes
chatState.subscribe((snapshot) => {
  console.log('State Change:', snapshot);
});
```

### Manual Stream Testing
```javascript
const eventSource = new EventSource('/stream-endpoint');
eventSource.onmessage = (event) => {
  console.log('Raw SSE Event:', event.data);
};
```

### Network Analysis
1. Open browser Network tab
2. Filter by "stream" or "opey"
3. Check for:
   - Failed requests (red)
   - Long-running requests
   - Unexpected disconnections

## Getting Help

### Information to Provide
1. Debug data export from monitor
2. Console logs (with timestamps)
3. Network tab screenshots
4. Opey server logs
5. Exact reproduction steps
6. Browser and version information

### Log Collection Script
```bash
# Run comprehensive diagnostics
npm run debug:opey > opey-debug.log 2>&1

# Include environment info
echo "Environment:" >> opey-debug.log
env | grep -i opey >> opey-debug.log
```

## Prevention

### Best Practices
1. Always test with debug mode during development
2. Monitor response times and connection health
3. Set up proper error handling and retries
4. Regular health checks for Opey service
5. Keep debug configuration in version control

### Monitoring in Production
- Implement health checks
- Set up alerting for connection failures
- Monitor response times and error rates
- Regular log analysis for patterns

## Reset and Recovery

### Reset Debug Settings
```javascript
// Reset all debug settings to defaults
window.opeyDebug.reset()
```

### Clear Chat State
```javascript
// Clear current chat and start fresh
chatState.clear()
chatState.setThreadId() // New thread ID
```

### Service Recovery
```bash
# Restart Opey service
docker restart opey-container
# or
systemctl restart opey
```
