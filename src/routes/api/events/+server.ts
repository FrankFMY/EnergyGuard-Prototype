import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { events } from '$lib/server/db/schema.js';
import { getDashboardData } from '$lib/server/services/engine.service.js';

export async function GET() {
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const sendEvent = (name: string, data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
				} catch (_e) {
					// Controller might be closed
				}
			};

			// Send initial full state
			try {
				const initialData = await getDashboardData();
				sendEvent('full', {
					...initialData,
					timestamp: new Date().toISOString()
				});
			} catch (e) {
				console.error('[SSE] Initial state error:', e);
			}

			// Periodic updates (diffs)
			const interval = setInterval(async () => {
				try {
					const currentData = await getDashboardData();
					sendEvent('diff', {
						type: 'diff',
						...currentData,
						timestamp: new Date().toISOString(),
						hash: Math.random().toString(36).substring(7)
					});
				} catch (_e) {
					// If sending fails, clear interval
					clearInterval(interval);
				}
			}, 5000);

			// Keep-alive heartbeat
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': heartbeat\n\n'));
				} catch (_e) {
					clearInterval(heartbeat);
				}
			}, 15000);

			return () => {
				clearInterval(interval);
				clearInterval(heartbeat);
			};
		},
		cancel() {
			// Cleanup is handled by start return
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
}

export async function POST({ request }) {
	// For demo purposes, we allow unauthorized posts if it's from the simulator
	const body = await request.json();
	
	if (!body.message || !body.level) {
		throw error(400, 'Missing message or level');
	}

	const [newEvent] = await db.insert(events).values({
		message: body.message,
		level: body.level,
		engine_id: body.engine_id || null,
		time: new Date()
	}).returning();

	return json(newEvent);
}
