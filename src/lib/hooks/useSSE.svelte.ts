import { browser } from '$app/environment';
import type { DashboardData } from '$lib/types/index.js';

interface DiffUpdate {
	type: 'diff';
	hash: string;
	engines?: DashboardData['engines'];
	summary?: DashboardData['summary'];
	events?: DashboardData['events'];
	timestamp: string;
}

/**
 * Merges diff update into existing data
 */
function applyDiff(current: DashboardData, diff: DiffUpdate): DashboardData {
	const updated: DashboardData = {
		...current,
		timestamp: diff.timestamp
	};

	// Update engines if provided
	if (diff.engines && diff.engines.length > 0) {
		const enginesMap = new Map(current.engines.map((e) => [e.id, e]));
		for (const engine of diff.engines) {
			enginesMap.set(engine.id, engine);
		}
		updated.engines = Array.from(enginesMap.values());
	}

	// Update summary if provided
	if (diff.summary) {
		updated.summary = diff.summary;
	}

	// Update events if provided
	if (diff.events) {
		updated.events = diff.events;
	}

	return updated;
}

/**
 * Creates a reactive store that connects to the SSE endpoint for real-time updates
 * Supports both full updates and diff-based partial updates for efficiency
 */
export function createSSEConnection(initialData: DashboardData) {
	let data = $state<DashboardData>(initialData);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let lastEventId = $state<string | null>(null);
	let eventSource: EventSource | null = null;
	let reconnectAttempts = 0;
	const maxReconnectAttempts = 5;
	const reconnectDelay = 3000;

	function connect() {
		if (!browser || eventSource) return;

		eventSource = new EventSource('/api/events');

		eventSource.onopen = () => {
			connected = true;
			error = null;
			reconnectAttempts = 0;
		};

		// Handle full updates
		eventSource.addEventListener('full', (event: MessageEvent) => {
			try {
				const newData = JSON.parse(event.data) as DashboardData;
				data = newData;
				lastEventId = event.lastEventId;
			} catch (e) {
				console.error('[SSE] Failed to parse full data:', e);
			}
		});

		// Handle diff updates
		eventSource.addEventListener('diff', (event: MessageEvent) => {
			try {
				const diffData = JSON.parse(event.data) as DiffUpdate;
				data = applyDiff(data, diffData);
				lastEventId = event.lastEventId;
			} catch (e) {
				console.error('[SSE] Failed to parse diff data:', e);
			}
		});

		// Handle legacy message format (fallback)
		eventSource.onmessage = (event) => {
			try {
				const newData = JSON.parse(event.data) as DashboardData;
				data = newData;
			} catch (e) {
				// Ignore heartbeat comments
				if (!event.data.startsWith(':')) {
					console.error('[SSE] Failed to parse message:', e);
				}
			}
		};

		eventSource.onerror = () => {
			connected = false;

			if (reconnectAttempts < maxReconnectAttempts) {
				reconnectAttempts++;
				error = `Connection lost. Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...`;
			} else {
				error = 'Connection lost. Please refresh the page.';
				disconnect();
			}
		};
	}

	function disconnect() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
			connected = false;
		}
	}

	function reconnect() {
		disconnect();
		reconnectAttempts = 0;
		setTimeout(connect, reconnectDelay);
	}

	return {
		get data() {
			return data;
		},
		get connected() {
			return connected;
		},
		get error() {
			return error;
		},
		get lastEventId() {
			return lastEventId;
		},
		connect,
		disconnect,
		reconnect
	};
}
