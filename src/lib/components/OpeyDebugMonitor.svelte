<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { createLogger } from '$lib/utils/logger';
	import type { StreamEvent } from '$lib/opey/services/ChatService';
	import type { ChatStateSnapshot } from '$lib/opey/state/ChatState';
	import { Accordion } from '@skeletonlabs/skeleton-svelte';
	import {
		Activity,
		AlertCircle,
		CheckCircle,
		Clock,
		MessageSquare,
		Settings,
		Zap
	} from '@lucide/svelte';

	const logger = createLogger('OpeyDebugMonitor');

	interface Props {
		chatController?: any;
		chatState?: any;
		enabled?: boolean;
		position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
	}

	let { chatController, chatState, enabled = false, position = 'bottom-right' }: Props = $props();

	interface EventLog {
		id: string;
		timestamp: Date;
		type: string;
		details: any;
		status: 'success' | 'error' | 'warning' | 'info';
	}

	interface MessageStats {
		total: number;
		pending: number;
		complete: number;
		errors: number;
		tools: number;
		approvals: number;
	}

	interface ConnectionStats {
		streamEvents: number;
		networkErrors: number;
		lastEventTime: Date | null;
		avgResponseTime: number;
		isStreaming: boolean;
	}

	let eventLog: EventLog[] = $state([]);
	let messageStats: MessageStats = $state({
		total: 0,
		pending: 0,
		complete: 0,
		errors: 0,
		tools: 0,
		approvals: 0
	});
	let connectionStats: ConnectionStats = $state({
		streamEvents: 0,
		networkErrors: 0,
		lastEventTime: null,
		avgResponseTime: 0,
		isStreaming: false
	});

	let chatSnapshot: ChatStateSnapshot = $state({ threadId: '', messages: [] });
	let isExpanded = $state(false);
	let maxLogEntries = 100;
	let responseTimes: number[] = [];

	// Position classes
	const positionClasses = {
		'top-right': 'top-4 right-4',
		'top-left': 'top-4 left-4',
		'bottom-right': 'bottom-4 right-4',
		'bottom-left': 'bottom-4 left-4'
	};

	function addLogEntry(
		type: string,
		details: any,
		status: 'success' | 'error' | 'warning' | 'info' = 'info'
	) {
		const entry: EventLog = {
			id: browser ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
			timestamp: new Date(),
			type,
			details,
			status
		};

		eventLog = [entry, ...eventLog].slice(0, maxLogEntries);
		logger.debug(`Debug monitor logged: ${type}`, details);
	}

	function updateConnectionStats(event: StreamEvent) {
		connectionStats.streamEvents++;
		connectionStats.lastEventTime = new Date();
		connectionStats.isStreaming =
			event.type !== 'assistant_complete' && event.type !== 'tool_complete';
		connectionStats = { ...connectionStats };
	}

	function updateMessageStats() {
		const messages = chatSnapshot.messages;

		messageStats.total = messages.length;
		messageStats.pending = messages.filter((m) => m.isStreaming === true).length;
		messageStats.complete = messages.filter((m) => m.isStreaming === false).length;
		messageStats.errors = messages.filter((m) => m.error).length;
		messageStats.tools = messages.filter((m) => m.role === 'tool').length;
		messageStats.approvals = messages.filter(
			(m) => m.role === 'tool' && (m as any).waitingForApproval
		).length;

		messageStats = { ...messageStats };
	}

	function calculateResponseTime(startTime: Date): number {
		return Date.now() - startTime.getTime();
	}

	function updateAvgResponseTime(responseTime: number) {
		responseTimes.push(responseTime);
		if (responseTimes.length > 10) {
			responseTimes = responseTimes.slice(-10); // Keep only last 10
		}
		connectionStats.avgResponseTime =
			responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
		connectionStats = { ...connectionStats };
	}

	function clearLog() {
		eventLog = [];
		addLogEntry('system', 'Debug log cleared', 'info');
	}

	function exportLog() {
		const exportData = {
			timestamp: new Date().toISOString(),
			messageStats,
			connectionStats,
			chatSnapshot,
			eventLog: eventLog.slice(0, 50) // Export last 50 events
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `opey-debug-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);

		addLogEntry('system', 'Debug data exported', 'success');
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'success':
				return CheckCircle;
			case 'error':
				return AlertCircle;
			case 'warning':
				return AlertCircle;
			default:
				return MessageSquare;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'success':
				return 'text-success-600';
			case 'error':
				return 'text-error-600';
			case 'warning':
				return 'text-warning-600';
			default:
				return 'text-surface-600';
		}
	}

	function formatTimestamp(date: Date): string {
		return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
	}

	let streamEventListener: ((event: StreamEvent) => void) | null = null;
	let messageStartTimes: Map<string, Date> = new Map();

	onMount(() => {
		if (!enabled || !chatController) return;

		addLogEntry('system', 'Debug monitor initialized', 'success');

		// Subscribe to chat state changes
		if (chatState) {
			chatState.subscribe((snapshot: ChatStateSnapshot) => {
				const previousCount = chatSnapshot.messages.length;
				chatSnapshot = snapshot;

				if (snapshot.messages.length !== previousCount) {
					addLogEntry(
						'state_change',
						{
							messageCount: snapshot.messages.length,
							threadId: snapshot.threadId
						},
						'info'
					);
				}

				updateMessageStats();
			});
		}

		// Listen to stream events if possible
		if (chatController.service && typeof chatController.service.onStreamEvent === 'function') {
			streamEventListener = (event: StreamEvent) => {
				updateConnectionStats(event);

				// Track response times for messages
				if (event.type === 'assistant_start') {
					messageStartTimes.set(event.messageId, new Date());
				} else if (event.type === 'assistant_complete') {
					const startTime = messageStartTimes.get(event.messageId);
					if (startTime) {
						const responseTime = calculateResponseTime(startTime);
						updateAvgResponseTime(responseTime);
						messageStartTimes.delete(event.messageId);

						addLogEntry(
							'message_complete',
							{
								messageId: event.messageId,
								responseTime: responseTime + 'ms'
							},
							'success'
						);
					}
				} else if (event.type === 'error') {
					connectionStats.networkErrors++;
					connectionStats = { ...connectionStats };
				}

				addLogEntry(
					'stream_event',
					{
						eventType: event.type,
						...event
					},
					event.type === 'error' ? 'error' : 'info'
				);
			};

			chatController.service.onStreamEvent(streamEventListener);
		}
	});

	onDestroy(() => {
		if (streamEventListener && chatController?.service?.onStreamEvent) {
			// Note: Most implementations don't support removing listeners, but we try
			addLogEntry('system', 'Debug monitor destroyed', 'info');
		}
	});
</script>

{#if browser && enabled}
	<div class="fixed z-50 {positionClasses[position]}">
		<!-- Debug Monitor Toggle Button -->
		{#if !isExpanded}
			<button
				class="btn preset-filled-primary-500 rounded-full p-3 shadow-lg"
				onclick={() => (isExpanded = true)}
				title="Open Opey Debug Monitor"
			>
				<Activity size={20} />
				{#if messageStats.pending > 0}
					<span class="badge preset-filled-warning-500 absolute -top-2 -right-2 text-xs">
						{messageStats.pending}
					</span>
				{/if}
			</button>
		{:else}
			<!-- Debug Monitor Panel -->
			<div class="card preset-filled-surface-50-900 max-h-96 w-96 overflow-hidden shadow-xl">
				<!-- Header -->
				<header class="preset-filled-primary-500 flex items-center justify-between p-3">
					<div class="flex items-center gap-2">
						<Activity size={16} />
						<span class="text-sm font-semibold">Opey Debug Monitor</span>
					</div>
					<div class="flex items-center gap-2">
						<button
							class="btn btn-sm preset-ghost-surface-500"
							onclick={clearLog}
							title="Clear log"
						>
							Clear
						</button>
						<button
							class="btn btn-sm preset-ghost-surface-500"
							onclick={exportLog}
							title="Export debug data"
						>
							Export
						</button>
						<button
							class="btn btn-sm preset-ghost-surface-500"
							onclick={() => (isExpanded = false)}
							title="Close"
						>
							×
						</button>
					</div>
				</header>

				<!-- Content -->
				<div class="max-h-80 space-y-3 overflow-y-auto p-3">
					<!-- Stats Summary -->
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div class="preset-filled-secondary-100-800 rounded p-2">
							<div class="font-semibold">Messages</div>
							<div>Total: {messageStats.total}</div>
							<div>Pending: <span class="text-warning-600">{messageStats.pending}</span></div>
							<div>Errors: <span class="text-error-600">{messageStats.errors}</span></div>
						</div>
						<div class="preset-filled-secondary-100-800 rounded p-2">
							<div class="font-semibold">Connection</div>
							<div>Events: {connectionStats.streamEvents}</div>
							<div>Avg Response: {Math.round(connectionStats.avgResponseTime)}ms</div>
							<div>Streaming: {connectionStats.isStreaming ? 'Yes' : 'No'}</div>
						</div>
					</div>

					<!-- Current Thread -->
					<div class="preset-filled-secondary-100-800 rounded p-2 text-xs">
						<div class="font-semibold">Thread ID</div>
						<div class="font-mono text-xs break-all">{chatSnapshot.threadId || 'None'}</div>
					</div>

					<!-- Event Log -->
					<details class="preset-filled-secondary-100-800 rounded">
						<summary class="cursor-pointer p-2">
							<span class="flex items-center gap-2">
								<MessageSquare size={14} />
								Event Log ({eventLog.length})
							</span>
						</summary>
						<div class="p-2">
							<div class="max-h-48 space-y-1 overflow-y-auto">
								{#each eventLog.slice(0, 20) as entry (entry.id)}
									{@const IconComponent = getStatusIcon(entry.status)}
									<div
										class="preset-filled-surface-100-800 flex items-start gap-2 rounded p-2 text-xs"
									>
										<IconComponent size={12} class={getStatusColor(entry.status)} />
										<div class="min-w-0 flex-1">
											<div class="flex items-start justify-between">
												<span class="font-semibold">{entry.type}</span>
												<span class="text-xs opacity-75">{formatTimestamp(entry.timestamp)}</span>
											</div>
											{#if typeof entry.details === 'object'}
												<pre class="overflow-x-auto text-xs">{JSON.stringify(
														entry.details,
														null,
														1
													)}</pre>
											{:else}
												<div class="text-xs">{entry.details}</div>
											{/if}
										</div>
									</div>
								{/each}
								{#if eventLog.length === 0}
									<div class="p-4 text-center text-xs opacity-75">No events logged yet</div>
								{/if}
							</div>
						</div>
					</details>

					<!-- Connection Status -->
					<div class="flex items-center gap-2 text-xs">
						<div class="flex items-center gap-1">
							{#if connectionStats.isStreaming}
								<Zap size={12} class="text-success-600" />
								<span>Streaming</span>
							{:else}
								<Clock size={12} class="text-surface-600" />
								<span>Idle</span>
							{/if}
						</div>
						{#if connectionStats.lastEventTime}
							<span class="opacity-75">
								Last: {formatTimestamp(connectionStats.lastEventTime)}
							</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
