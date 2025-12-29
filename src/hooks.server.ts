import mqtt from 'mqtt';
import { db } from '$lib/server/db/index.js';
import { telemetry, engines, events, alerts } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';

let client: mqtt.MqttClient;

// Rate limiting store (in-memory, use Redis in production for multiple instances)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
	'/api/auth',
	'/login',
	'/register',
	'/forgot-password',
	'/api/health'
];

// Rate limiting function
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
	const now = Date.now();
	const record = rateLimitStore.get(ip);

	if (!record || now > record.resetTime) {
		rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
		return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
	}

	if (record.count >= RATE_LIMIT_MAX) {
		return { allowed: false, remaining: 0 };
	}

	record.count++;
	return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// Clean up old rate limit entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [ip, record] of rateLimitStore.entries()) {
		if (now > record.resetTime) {
			rateLimitStore.delete(ip);
		}
	}
}, 60 * 1000);

async function seedEngines() {
	const engineList = [
		{ id: 'gpu-1', model: 'Jenbacher J420', hours: 1450 },
		{ id: 'gpu-2', model: 'Jenbacher J420', hours: 1980 },
		{ id: 'gpu-3', model: 'Jenbacher J624', hours: 500 },
		{ id: 'gpu-4', model: 'Jenbacher J420', hours: 1200 },
		{ id: 'gpu-5', model: 'Jenbacher J420', hours: 1850 },
		{ id: 'gpu-6', model: 'Jenbacher J420', hours: 100 }
	];

	for (const eng of engineList) {
		await db
			.insert(engines)
			.values({
				id: eng.id,
				model: eng.model,
				status: 'ok',
				total_hours: eng.hours
			})
			.onConflictDoNothing();
	}
	console.log('[KASTOR] Engines seeded');
}

// Create alert from telemetry threshold violation
async function createAlertFromTelemetry(
	engineId: string,
	metric: string,
	actualValue: number,
	threshold: number,
	severity: 'warning' | 'critical'
) {
	const titles: Record<string, string> = {
		temp_exhaust: severity === 'critical' ? 'Critical Exhaust Temperature' : 'High Exhaust Temperature',
		vibration: severity === 'critical' ? 'Critical Vibration Level' : 'High Vibration Level'
	};

	await db.insert(alerts).values({
		engineId,
		severity,
		status: 'active',
		title: titles[metric] || `${metric} Alert`,
		message: `${metric} value ${actualValue.toFixed(1)} exceeds ${severity} threshold of ${threshold}`,
		metric,
		threshold,
		actualValue
	});
}

// MQTT handler
const mqttHandler: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	if (!client && env.MQTT_URL) {
		console.log('[KASTOR] Initializing MQTT Client...');
		seedEngines().catch(console.error);

		client = mqtt.connect(env.MQTT_URL, {
			username: env.MQTT_USERNAME,
			password: env.MQTT_PASSWORD,
			reconnectPeriod: 5000
		});

		client.on('connect', () => {
			console.log('[KASTOR] MQTT Client Connected');
			client.subscribe('factory/telemetry');
			client.subscribe('factory/events');
		});

		client.on('error', (error) => {
			console.error('[KASTOR] MQTT Error:', error.message);
		});

		client.on('message', async (topic, message) => {
			if (topic === 'factory/telemetry') {
				try {
					const payload = JSON.parse(message.toString());

					await db.insert(telemetry).values({
						time: new Date(payload.timestamp),
						engine_id: payload.engine_id,
						power_kw: payload.values.power,
						temp_exhaust: payload.values.temp,
						gas_consumption: payload.values.gas,
						vibration: payload.values.vibration,
						gas_pressure: payload.values.gas_pressure
					});

					// Status update and alert creation based on thresholds
					let status: 'ok' | 'warning' | 'error' = 'ok';

					// Temperature checks
					if (payload.values.temp > 530) {
						status = 'error';
						await createAlertFromTelemetry(
							payload.engine_id,
							'temp_exhaust',
							payload.values.temp,
							530,
							'critical'
						);
					} else if (payload.values.temp > 500) {
						status = 'warning';
						await createAlertFromTelemetry(
							payload.engine_id,
							'temp_exhaust',
							payload.values.temp,
							500,
							'warning'
						);
					}

					// Vibration checks
					if (payload.values.vibration > 15) {
						status = 'error';
						await createAlertFromTelemetry(
							payload.engine_id,
							'vibration',
							payload.values.vibration,
							15,
							'critical'
						);
					} else if (payload.values.vibration > 10 && status !== 'error') {
						status = status === 'ok' ? 'warning' : status;
						await createAlertFromTelemetry(
							payload.engine_id,
							'vibration',
							payload.values.vibration,
							10,
							'warning'
						);
					}

					await db.update(engines).set({ status }).where(eq(engines.id, payload.engine_id));
				} catch (e) {
					console.error('[KASTOR] Error processing telemetry:', e);
				}
			} else if (topic === 'factory/events') {
				try {
					const payload = JSON.parse(message.toString());

					await db.insert(events).values({
						time: new Date(payload.timestamp),
						level: payload.level,
						message: payload.message,
						engine_id: payload.engine_id
					});
				} catch (e) {
					console.error('[KASTOR] Error processing event:', e);
				}
			}
		});
	}

	return resolve(event);
};

// Rate limiting handler
const rateLimitHandler: Handle = async ({ event, resolve }) => {
	const ip = event.getClientAddress();
	const { allowed, remaining } = checkRateLimit(ip);

	if (!allowed) {
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': '60',
				'X-RateLimit-Remaining': '0'
			}
		});
	}

	const response = await resolve(event);

	// Add rate limit headers
	response.headers.set('X-RateLimit-Remaining', remaining.toString());

	return response;
};

// Authentication handler
const authHandler: Handle = async ({ event, resolve }) => {
	// Get session from better-auth
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	// Check if route requires authentication
	const isPublicRoute = PUBLIC_ROUTES.some((route) => event.url.pathname.startsWith(route));
	const isApiRoute = event.url.pathname.startsWith('/api/');

	// Protected routes check
	if (!isPublicRoute && !session) {
		// For API routes, return 401
		if (isApiRoute) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		// For page routes, redirect to login
		// Temporarily disabled for development - enable in production
		// return redirect(302, '/login');
	}

	return resolve(event);
};

// Better-auth SvelteKit handler
const betterAuthHandler: Handle = ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = sequence(rateLimitHandler, betterAuthHandler, authHandler, mqttHandler);
