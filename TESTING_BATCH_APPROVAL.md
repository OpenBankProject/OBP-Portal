# Testing the Batch Approval Migration

## Quick Start

The batch approval system has been implemented and is ready to test!

## Testing Methods

### 1. Using Test Buttons (UI)

In the OpeyChat header, you'll see two test buttons:

- **"Test Single"** - Creates a single approval request (shows inline card)
- **"Test Batch"** - Creates 3 approval requests at once (shows batch modal)

Click "Test Batch" to see the batch approval modal in action!

### 2. Using Browser Console

You can also trigger test approvals from the browser console:

```javascript
// Test single approval
window.addTestApprovalMessage();

// Test batch approval (3 tools)
window.addTestBatchApprovalMessage();
```

## What to Expect

### Single Approval (1 pending)
- Shows standard `ToolApprovalCard` accordion in chat
- Standard approval workflow
- No batch UI

### Batch Approval (2+ pending)
- First tool message shows batch approval interface
- All pending approvals grouped together inline
- Remaining tool messages hidden until decisions made
- Provides bulk actions:
  - **Approve All** - Approve everything with default levels
  - **Deny All** - Deny everything
  - **Approve Low-Risk Only** - Smart approval of low-risk operations
- Each approval can be reviewed individually using familiar ToolApprovalCard
- Submit button disabled until all decisions are made
- After decisions, approved/denied tools show compact status

## Batch Approval Interface Features

### Top Section
- Shows total count of pending operations
- Live counter: X approved, Y denied
- Warning styling to indicate pending decisions

### Bulk Actions Bar
- **Approve All**: Approves all tools with their default approval levels
- **Deny All**: Denies all tools
- **Approve Low-Risk Only**: Automatically approves tools with "low" risk level using session-level approval

### Individual Approvals
- Each tool shows the full `ToolApprovalCard` UI
- After approval/denial, the card collapses to show compact status
- Approved items show ✓ with the approval level (green border)
- Denied items show ✗ (red border)

### Footer
- Shows "Submit All Decisions" button
- Disabled with "Review All First" text until all decisions made
- Submits batch decision to backend once enabled

## Expected Behavior

1. **Automatic Detection**: When 2+ tools require approval, batch UI appears inline
2. **Individual Decisions**: Click approve/deny on each card
3. **Visual Feedback**: Cards collapse to show approved/denied status
4. **Submit**: Once all reviewed, click "Submit All Decisions"
5. **Stream Continues**: Backend processes approvals and continues execution
6. **Natural Flow**: Everything happens in chat - no modal popups

## Real Backend Integration

When connected to the updated backend:

1. Backend sends `batch_approval_request` SSE event
2. Frontend detects 2+ pending approvals
3. Batch UI renders inline in chat at the first tool message
4. User reviews and decides on each tool
5. Frontend sends `POST /stream` with `batch_decisions`
6. Backend processes all decisions at once
7. Stream resumes with tool executions
8. Other tool messages in batch become visible after submission

## Troubleshooting

### Batch UI Doesn't Show
- Check that you have 2+ pending approvals
- Check browser console for errors
- Verify `pendingApprovalTools` derived state has 2+ items
- Ensure tools have `waitingForApproval: true`

### Approvals Not Sending
- Check network tab for POST /stream requests
- Verify payload format matches expected schema
- Check backend logs for processing errors

### Cards Not Updating
- Verify Svelte reactivity is working
- Check that decisions Map is being updated
- Ensure batch decisions are triggering re-renders

## Files to Review

- `src/lib/components/tool-messages/ToolMessage.svelte` - Now handles both single and batch approvals
- `src/lib/components/ChatMessage.svelte` - Passes batch props to ToolMessage
- `src/lib/components/OpeyChat.svelte` - Integration and batch grouping logic
- `src/lib/opey/controllers/ChatController.ts` - Batch submission logic
- `src/lib/opey/services/RestChatService.ts` - Network calls
- `src/lib/opey/state/ChatState.ts` - State management

## Next Steps

1. ✅ Test with UI buttons
2. ⏳ Test with real backend
3. ⏳ Gather user feedback
4. ⏳ Fine-tune UX (animations, keyboard shortcuts)
5. ⏳ Add analytics tracking

## Design Decisions

### Why Inline Instead of Modal?
- **Less Disruptive**: Users stay in the conversation flow
- **Natural Context**: Approvals appear where the assistant requested them
- **Better for Chat**: Feels like part of the conversation, not a popup
- **Still Organized**: Batch UI keeps everything together while being inline
- **Scrollable**: Users can scroll back to review context if needed

### Why Reuse ToolApprovalCard?
- Maintains UI consistency
- Avoids code duplication
- Shows full approval metadata
- Users already familiar with the interface

### Why Hide Other Batch Messages?
- Prevents visual clutter
- All approvals shown in one place
- Clear what needs decisions
- After submission, all tools become visible normally

### Why Disable Submit Until All Reviewed?
- Ensures user makes conscious decision on each tool
- Prevents accidental approval/denial
- Clear indication of what's pending

## Feedback Welcome!

If you find any issues or have suggestions for improvement, please let us know!
