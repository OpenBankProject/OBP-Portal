<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { ArrowLeft, Send, Users, Settings } from '@lucide/svelte';

    console.log('[chat-sse] chat room component module loaded');

    let { data } = $props();

    console.log('[chat-sse] first message from REST (JSON):', JSON.stringify(data.messages[0]));
    console.log('[chat-sse] created_at type:', typeof data.messages[0]?.created_at, 'value:', data.messages[0]?.created_at);
    let messages: any[] = $state([...data.messages]);
    let messageContent = $state('');
    let sending = $state(false);
    let errorMessage = $state('');
    let showParticipants = $state(false);
    let messagesContainer: HTMLDivElement | undefined = $state();
    let streamConnected = $state(false);
    let transportReason = $state('connecting…');

    function scrollToBottom() {
        if (messagesContainer) {
            setTimeout(() => {
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }, 0);
        }
    }

    // Scroll to bottom on initial load
    $effect(() => {
        if (messagesContainer && messages.length > 0) {
            scrollToBottom();
        }
    });

    function appendMessage(msg: any) {
        const existingIds = new Set(messages.map(m => m.chat_message_id));
        if (!existingIds.has(msg.chat_message_id)) {
            messages = [...messages, msg];
            scrollToBottom();
        }
    }

    function handleMessageEvent(event: any) {
        if (event.event_type === 'message_deleted') {
            messages = messages.map(m =>
                m.chat_message_id === event.chat_message_id
                    ? { ...m, is_deleted: true, content: '' }
                    : m
            );
        } else if (event.event_type === 'message_edited') {
            const existing = messages.find(m => m.chat_message_id === event.chat_message_id);
            if (existing) {
                messages = messages.map(m =>
                    m.chat_message_id === event.chat_message_id
                        ? { ...m, content: event.content, updated_at: event.updated_at }
                        : m
                );
            } else {
                appendMessage(event);
            }
        } else {
            appendMessage(event);
        }
    }

    // --- SSE stream with polling fallback ---
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function connectSSE() {
        console.log('[chat-sse] connectSSE: creating EventSource');
        eventSource = new EventSource(`/api/chat/${data.chatRoom.chat_room_id}/stream`);

        eventSource.onopen = () => {
            console.log('[chat-sse] onopen fired');
            streamConnected = true;
            // Don't clear transportReason here — the server may immediately follow
            // with a `transport-error` event, and clearing here would race with that
            // handler. We'll let the next transport-error (or the next onerror
            // fallback) overwrite it.
            // Stop polling if it was running as fallback
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };

        eventSource.onmessage = (event) => {
            // A real data message proves the gRPC stream is flowing — safe to
            // clear any stale reason from a previous failure.
            transportReason = '';
            try {
                const msg = JSON.parse(event.data);
                handleMessageEvent(msg);
            } catch {
                // Ignore parse errors
            }
        };

        eventSource.addEventListener('transport-error', (event: MessageEvent) => {
            console.log('[chat-sse] transport-error event:', event.data);
            try {
                const payload = JSON.parse(event.data);
                transportReason = payload.reason || 'gRPC transport error';
            } catch {
                transportReason = 'gRPC transport error';
            }
        });

        eventSource.onerror = () => {
            console.log('[chat-sse] onerror fired, readyState=', eventSource?.readyState);
            streamConnected = false;
            // Only fall back to the generic message if we never got a specific
            // `transport-error` event with the real reason.
            if (!transportReason || transportReason === 'connecting…') {
                transportReason = 'SSE connection to server failed';
            }
            eventSource?.close();
            eventSource = null;
            // Fall back to polling
            startPolling();
            // Try to reconnect SSE after 10 seconds
            setTimeout(connectSSE, 10000);
        };
    }

    // Track the latest message timestamp for polling fallback
    let latestTimestamp = $derived.by(() => {
        if (messages.length === 0) return '';
        return messages.reduce((latest, msg) => {
            return msg.created_at > latest ? msg.created_at : latest;
        }, messages[0].created_at);
    });

    function startPolling() {
        if (pollInterval) return; // Already polling
        pollInterval = setInterval(async () => {
            try {
                let url = `/api/chat/${data.chatRoom.chat_room_id}/messages`;
                if (latestTimestamp) {
                    url += `?from_date=${encodeURIComponent(latestTimestamp)}`;
                }
                const res = await fetch(url);
                if (!res.ok) return;

                const result = await res.json();
                if (result.messages && result.messages.length > 0) {
                    const existingIds = new Set(messages.map(m => m.chat_message_id));
                    const newMessages = result.messages.filter(
                        (m: any) => !existingIds.has(m.chat_message_id)
                    );
                    if (newMessages.length > 0) {
                        messages = [...messages, ...newMessages];
                        scrollToBottom();
                    }
                }
            } catch {
                // Silently ignore polling errors
            }
        }, 4000);
    }

    // Start with SSE — browser only (EventSource is not defined during SSR).
    onMount(() => {
        console.log('[chat-sse] onMount fired');
        connectSSE();
    });

    onDestroy(() => {
        eventSource?.close();
        if (pollInterval) clearInterval(pollInterval);
    });

    async function sendMessage(event: SubmitEvent) {
        event.preventDefault();
        const content = messageContent.trim();
        if (!content || sending) return;

        sending = true;
        errorMessage = '';

        try {
            const res = await fetch(`/api/chat/${data.chatRoom.chat_room_id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            const result = await res.json();

            if (!res.ok) {
                errorMessage = result.error || 'Failed to send message.';
                return;
            }

            // Append the sent message locally (stream will deduplicate)
            appendMessage(result);
            messageContent = '';
        } catch {
            errorMessage = 'Failed to send message. Please try again.';
        } finally {
            sending = false;
        }
    }
</script>

<!-- Chat Room Header -->
<div class="mb-4 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
        <a
            href="/user/chat"
            class="btn btn-sm preset-outlined-surface-500 gap-1"
            data-testid="back-to-chat-rooms"
        >
            <ArrowLeft class="size-4" />
            Back
        </a>
        <div class="min-w-0">
            <h2 class="text-lg font-semibold text-surface-900-50 truncate" data-testid="chat-room-name">
                {data.chatRoom.name}
            </h2>
            {#if data.chatRoom.description}
                <p class="text-sm text-surface-600-400 truncate">{data.chatRoom.description}</p>
            {/if}
        </div>
    </div>
    <div class="flex items-center gap-2">
        <span
            class="flex items-center"
            title={streamConnected
                ? 'gRPC live stream'
                : transportReason === 'connecting…'
                    ? 'Connecting to gRPC stream…'
                    : `REST polling — fell back because: ${transportReason || 'unknown reason'}`}
            data-testid="connection-status"
            data-transport={streamConnected ? 'grpc' : 'rest'}
        >
            <span
                class="inline-block size-2 rounded-full {streamConnected ? 'bg-green-500' : 'bg-orange-500'}"
                aria-hidden="true"
            ></span>
        </span>
        <button
            type="button"
            class="btn btn-sm preset-outlined-surface-500 gap-1"
            onclick={() => showParticipants = !showParticipants}
            data-testid="toggle-participants"
        >
            <Users class="size-4" />
            {data.participants.length}
        </button>
        <a
            href="/user/chat/{data.chatRoom.chat_room_id}/settings"
            class="btn btn-sm preset-outlined-surface-500 gap-1"
            title="Room settings"
            data-testid="chat-room-settings"
        >
            <Settings class="size-4" />
        </a>
    </div>
</div>

{#if showParticipants}
    <div class="mb-4 rounded-lg border border-surface-300-600 bg-surface-50-900 p-4" data-testid="participants-list">
        <h3 class="mb-2 text-sm font-semibold">Participants</h3>
        <ul class="space-y-1">
            {#each data.participants as participant (participant.participant_id)}
                <li class="text-sm text-surface-700-300" data-testid="participant-{participant.user_id}">
                    {participant.username || participant.user_id}
                    {#if participant.user_id === data.currentUserId}
                        <span class="text-xs text-primary-500">(you)</span>
                    {/if}
                </li>
            {/each}
        </ul>
    </div>
{/if}

{#if errorMessage}
    <div class="bg-error-500/10 border-error-500 mb-4 rounded-lg border p-3 text-center">
        <p class="text-error-500 text-sm font-semibold">{errorMessage}</p>
    </div>
{/if}

<!-- Messages -->
<div
    bind:this={messagesContainer}
    class="mb-4 space-y-3 rounded-lg border border-surface-300-600 bg-surface-50-900 p-4"
    style="min-height: 300px; max-height: 60vh; overflow-y: auto;"
    data-testid="messages-container"
>
    {#if messages.length > 0}
        {#each messages as message (message.chat_message_id)}
            {@const isOwn = message.sender_user_id === data.currentUserId}
            <div
                class="flex {isOwn ? 'justify-end' : 'justify-start'}"
                data-testid="message-{message.chat_message_id}"
            >
                <div class="max-w-[75%] rounded-lg px-4 py-2 {isOwn ? 'bg-primary-500 text-white' : 'bg-surface-200-700 text-surface-900-50'}">
                    {#if !isOwn}
                        <p class="mb-1 text-xs font-semibold opacity-70" data-testid="message-sender">
                            {message.sender_username || message.sender_user_id}
                        </p>
                    {/if}
                    {#if message.is_deleted}
                        <p class="italic opacity-50">This message was deleted.</p>
                    {:else}
                        <p class="whitespace-pre-wrap break-words">{message.content}</p>
                    {/if}
                    <p class="mt-1 text-xs opacity-50">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        {/each}
    {:else}
        <div class="flex items-center justify-center py-12 text-surface-500">
            <p>No messages yet. Start the conversation!</p>
        </div>
    {/if}
</div>

<!-- Send Message -->
{#if !data.chatRoom.is_archived}
    <form onsubmit={sendMessage} class="flex gap-2" data-testid="send-message-form">
        <input
            name="content"
            type="text"
            bind:value={messageContent}
            class="input flex-1 rounded-md border border-surface-300-600 px-3 py-2"
            placeholder="Type a message..."
            disabled={sending}
            autocomplete="off"
            data-testid="message-input"
        />
        <button
            type="submit"
            class="btn preset-filled-primary-500 gap-2"
            disabled={!messageContent.trim() || sending}
            data-testid="send-message-button"
        >
            <Send class="size-4" />
            {sending ? 'Sending...' : 'Send'}
        </button>
    </form>
{:else}
    <div class="rounded-lg bg-surface-200-700 p-3 text-center text-sm text-surface-600-400">
        This chat room is archived. No new messages can be sent.
    </div>
{/if}
