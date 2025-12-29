import type { RequestHandler } from './$types.js';
import { getDashboardData } from '$lib/server/services/engine.service.js';
import { cache, CACHE_KEYS, CACHE_TTL } from '$lib/server/cache.js';
import type { DashboardData } from '$lib/types/api.js';

/**
 * Creates a hash from an object for comparison
 * Simple but effective for detecting data changes
 */
function createDataHash(data: unknown): string {
	const str = JSON.stringify(data);
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash.toString(36);
}

/**
 * Computes a diff between two engine arrays, returning only changed engines
 */
function computeEnginesDiff(
	previous: DashboardData['engines'] | null,
	current: DashboardData['engines']
): { changed: DashboardData['engines']; unchanged: string[] } {
	if (!previous) {
		return { changed: current, unchanged: [] };
	}

	const previousMap = new Map(previous.map((e) => [e.id, e]));
	const changed: DashboardData['engines'] = [];
	const unchanged: string[] = [];

	for (const engine of current) {
		const prev = previousMap.get(engine.id);
		if (!prev || createDataHash(prev) !== createDataHash(engine)) {
			changed.push(engine);
		} else {
			unchanged.push(engine.id);
		}
	}

	return { changed, unchanged };
}

/**
 * Server-Sent Events (SSE) endpoint for real-time dashboard updates
 * Uses diff-based updates to reduce bandwidth - only sends changed data
 */
export const GET: RequestHandler = async () => {
	const encoder = new TextEncoder();
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let isClosing = false;
	let lastData: DashboardData | null = null;
	let lastDataHash: string | null = null;
	let messageId = 0;

	const stream = new ReadableStream({
		async start(controller) {
			// Cached dashboard data fetch
			const getCachedDashboardData = async (): Promise<DashboardData> => {
				return cache.getOrSet<DashboardData>(
					CACHE_KEYS.DASHBOARD_DATA,
					getDashboardData,
					CACHE_TTL.SHORT
				);
			};

			// Send data function with diff computation
			const sendData = async (forceFull = false) => {
				if (isClosing) return;

				try {
					const currentData = await getCachedDashboardData();
					const currentHash = createDataHash(currentData);

					// Skip if data hasn't changed
					if (!forceFull && lastDataHash === currentHash) {
						// Send heartbeat to keep connection alive
						if (!isClosing) {
							controller.enqueue(encoder.encode(': heartbeat\n\n'));
						}
						return;
					}

					messageId++;

					// On first message or force full, send complete data
					if (forceFull || !lastData) {
						const message = `id: ${messageId}\nevent: full\ndata: ${JSON.stringify(currentData)}\n\n`;
						if (!isClosing) {
							controller.enqueue(encoder.encode(message));
						}
					} else {
						// Compute diff for engines (the main changing data)
						const enginesDiff = computeEnginesDiff(lastData.engines, currentData.engines);

						// Check if summary changed
						const summaryChanged =
							createDataHash(lastData.summary) !== createDataHash(currentData.summary);

						// Check if events changed
						const eventsChanged =
							createDataHash(lastData.events) !== createDataHash(currentData.events);

						// If most data changed, send full update
						const changedRatio = enginesDiff.changed.length / currentData.engines.length;
						if (changedRatio > 0.7 || (summaryChanged && eventsChanged)) {
							const message = `id: ${messageId}\nevent: full\ndata: ${JSON.stringify(currentData)}\n\n`;
							if (!isClosing) {
								controller.enqueue(encoder.encode(message));
							}
						} else {
							// Send partial update
							const partialUpdate = {
								type: 'diff',
								hash: currentHash,
								engines: enginesDiff.changed.length > 0 ? enginesDiff.changed : undefined,
								summary: summaryChanged ? currentData.summary : undefined,
								events: eventsChanged ? currentData.events : undefined,
								timestamp: currentData.timestamp
							};

							const message = `id: ${messageId}\nevent: diff\ndata: ${JSON.stringify(partialUpdate)}\n\n`;
							if (!isClosing) {
								controller.enqueue(encoder.encode(message));
							}
						}
					}

					lastData = currentData;
					lastDataHash = currentHash;
				} catch (error) {
					if (!isClosing && !(error instanceof TypeError)) {
						console.error('[KASTOR] SSE Error:', error);
					}
				}
			};

			// Send full data immediately on connection
			await sendData(true);

			// Then check for updates every 2 seconds
			intervalId = setInterval(() => sendData(false), 2000);
		},

		cancel() {
			isClosing = true;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
