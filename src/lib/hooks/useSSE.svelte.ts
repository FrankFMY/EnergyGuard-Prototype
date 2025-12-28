import { browser } from '$app/environment';
import type { DashboardData } from '$lib/types/index.js';

/**
 * Creates a reactive store that connects to the SSE endpoint for real-time updates
 */
export function createSSEConnection(initialData: DashboardData) {
	let data = $state<DashboardData>(initialData);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let eventSource: EventSource | null = null;

	function connect() {
		if (!browser || eventSource) return;

		eventSource = new EventSource('/api/events');

		eventSource.onopen = () => {
			connected = true;
			error = null;
		};

		eventSource.onmessage = (event) => {
			try {
				const newData = JSON.parse(event.data) as DashboardData;
				data = newData;
			} catch (e) {
				console.error('Failed to parse SSE data:', e);
			}
		};

		eventSource.onerror = () => {
			connected = false;
			error = 'Connection lost. Reconnecting...';
			// EventSource will automatically try to reconnect
		};
	}

	function disconnect() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
			connected = false;
		}
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
		connect,
		disconnect
	};
}
