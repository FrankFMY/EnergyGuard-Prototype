import type { RequestHandler } from './$types.js';
import { getDashboardData } from '$lib/server/services/engine.service.js';
import { cache, CACHE_KEYS, CACHE_TTL } from '$lib/server/cache.js';
import type { DashboardData } from '$lib/types/api.js';

/**
 * Server-Sent Events (SSE) endpoint for real-time dashboard updates
 * Uses caching to reduce database load with multiple concurrent clients
 */
export const GET: RequestHandler = async () => {
	const encoder = new TextEncoder();
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let isClosing = false;

	const stream = new ReadableStream({
		async start(controller) {
			// Cached dashboard data fetch
			const getCachedDashboardData = async (): Promise<DashboardData> => {
				return cache.getOrSet<DashboardData>(
					CACHE_KEYS.DASHBOARD_DATA,
					getDashboardData,
					CACHE_TTL.SHORT // 2 seconds TTL for real-time data
				);
			};

			// Send data function with closed check
			const sendData = async () => {
				if (isClosing) return;

				try {
					const data = await getCachedDashboardData();
					const message = `data: ${JSON.stringify(data)}\n\n`;
					// Check again before enqueueing in case state changed during async operation
					if (!isClosing) {
						controller.enqueue(encoder.encode(message));
					}
				} catch (error) {
					// Ignore errors when closing (ERR_INVALID_STATE)
					if (!isClosing && !(error instanceof TypeError)) {
						console.error('[KASTOR] SSE Error:', error);
					}
				}
			};

			// Send data immediately on connection
			await sendData();

			// Then send every 2 seconds
			intervalId = setInterval(sendData, 2000);
		},

		cancel() {
			// Called when the client disconnects
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
			'X-Accel-Buffering': 'no' // Disable nginx buffering
		}
	});
};
