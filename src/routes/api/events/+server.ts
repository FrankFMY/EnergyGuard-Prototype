import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { events } from '$lib/server/db/schema.js';
import { subscribe, getCurrentData, canAcceptConnection } from '$lib/server/services/sse-broadcast.service.js';

export async function GET() {
	// Check if we can accept new connections
	if (!canAcceptConnection()) {
		throw error(503, 'Too many concurrent connections. Please try again later.');
	}
	// Track intervals for cleanup
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
	let unsubscribe: (() => void) | null = null;
	let isClosed = false;

	const cleanup = () => {
		isClosed = true;
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
		}
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = null;
		}
	};

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const sendEvent = (name: string, data: unknown) => {
				if (isClosed) return;
				try {
					controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
				} catch (_e) {
					cleanup();
				}
			};

			// Send initial full state from cached data
			try {
				const initialData = await getCurrentData();
				sendEvent('full', {
					...initialData,
					timestamp: new Date().toISOString()
				});
			} catch (e) {
				console.error('[SSE] Initial state error:', e);
			}

			// Subscribe to shared data updates (all clients get same data from cache)
			const sub = subscribe((data) => {
				if (isClosed) return;
				sendEvent('diff', {
					type: 'diff',
					...data,
					timestamp: new Date().toISOString(),
					hash: Math.random().toString(36).substring(7)
				});
			});

			// Handle subscription failure (max connections reached)
			if (sub === null) {
				sendEvent('error', { message: 'Server at capacity. Please try again later.' });
				cleanup();
				return;
			}
			unsubscribe = sub;

			// Keep-alive heartbeat
			heartbeatInterval = setInterval(() => {
				if (isClosed) {
					cleanup();
					return;
				}
				try {
					controller.enqueue(encoder.encode(': heartbeat\n\n'));
				} catch (_e) {
					cleanup();
				}
			}, 15000);
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}

export async function POST({ request, locals }) {
	// Require authentication for event creation (except internal simulator calls)
	const isInternalCall = request.headers.get('x-internal-key') === process.env.INTERNAL_API_KEY;

	if (!isInternalCall && !locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();

	if (!body.message || !body.level) {
		throw error(400, 'Missing message or level');
	}

	// Validate level
	if (!['info', 'warning', 'error'].includes(body.level)) {
		throw error(400, 'Invalid level. Must be info, warning, or error');
	}

	// Sanitize message (basic XSS prevention)
	const sanitizedMessage = String(body.message).slice(0, 500);

	const [newEvent] = await db
		.insert(events)
		.values({
			message: sanitizedMessage,
			level: body.level,
			engine_id: body.engine_id || null,
			time: new Date()
		})
		.returning();

	return json(newEvent);
}
