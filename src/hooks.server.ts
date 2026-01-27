import mqtt from 'mqtt';
import { db } from '$lib/server/db/index.js';
import { telemetry, engines, events, alerts } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '$lib/server/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';

let client: mqtt.MqttClient;

// Rate limiting store (in-memory, use Redis in production for multiple instances)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
// DEMO MODE: Increased limit for presentations (100 → 500 requests per minute)
const RATE_LIMIT_MAX = env.DEMO_MODE === 'true' || env.NODE_ENV === 'development' ? 500 : 100;

// Public routes that don't require authentication
// DEMO MODE: All routes are public for presentation
const PUBLIC_ROUTES = [
	'/api/auth',
	'/api/health',
	'/api/events',
	'/api/status',
	'/api/history',
	'/api/alerts',
	'/api/metrics',
	'/api/downtimes',
	'/api/workorders',
	'/api/engines',
	'/login',
	'/register',
	'/forgot-password',
	'/', // Main dashboard
	'/comparison', // Engine comparison
	'/analytics', // Analytics
	'/economics', // Economics
	'/alerts', // Alerts page
	'/work-orders', // Work orders
	'/maintenance', // Maintenance
	'/dashboards', // Dashboards
	'/reports', // Reports
	'/calendar', // Calendar
	'/integrations', // Integrations
	'/settings', // Settings
	'/admin', // Admin (for demo)
	'/demo', // Demo pages
	'/engine' // Engine detail pages
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

// Periodic cleanup of old data (runs every hour)
async function cleanupOldData() {
	try {
		// Delete resolved alerts older than 7 days
		await db.execute(sql`
			DELETE FROM alerts 
			WHERE status = 'resolved' 
			AND resolved_at < NOW() - INTERVAL '7 days'
		`);

		// Delete old events older than 7 days
		await db.execute(sql`
			DELETE FROM events 
			WHERE time < NOW() - INTERVAL '7 days'
		`);

		console.log('[EnergyGuard] Old data cleanup completed');
	} catch (e) {
		console.error('[EnergyGuard] Error during data cleanup:', e);
	}
}

// Run cleanup every hour
setInterval(cleanupOldData, 60 * 60 * 1000);

// Run initial cleanup after 1 minute of startup
setTimeout(cleanupOldData, 60 * 1000);

export async function seedEngines() {
	const engineList = [
		{ id: 'gpu-1', model: 'Weichai 16VCN', hours: 8500 },
		{ id: 'gpu-2', model: 'Weichai 16VCN', hours: 12300 },
		{ id: 'gpu-3', model: 'Yuchai YC16V', hours: 9800 },
		{ id: 'gpu-4', model: 'Yuchai YC16V', hours: 7200 },
		{ id: 'gpu-5', model: 'Jenbacher J620', hours: 1850 },
		{ id: 'gpu-6', model: 'Jenbacher J620', hours: 100 }
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
			.onConflictDoUpdate({
				target: engines.id,
				set: {
					model: eng.model,
					total_hours: eng.hours
				}
			});
	}
	console.log('[EnergyGuard] Engines seeded and synced');
}

// Startup initialization - seed data if database is empty
if (!building) {
	(async () => {
		try {
			const existingEngines = await db.select().from(engines).limit(1);
			if (existingEngines.length === 0) {
				console.log('[EnergyGuard] Database empty, seeding engines on startup...');
				await seedEngines();
			}

			// Seed spare parts
			const { seedSpareParts } = await import('$lib/server/services/maintenance.service.js');
			await seedSpareParts();

			console.log('[EnergyGuard] Startup seeding complete');
		} catch (error) {
			console.error('[EnergyGuard] CRITICAL - Startup seeding failed:', error);
			if (error instanceof Error) {
				console.error('[EnergyGuard] Error details:', error.message);
				console.error('[EnergyGuard] Stack trace:', error.stack);
			}
		}
	})();
}

// Track recent alerts to prevent flooding (engine:metric -> timestamp)
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 300_000; // 5 minutes cooldown between same alerts

// Auto-resolve alerts when metric returns to normal
async function autoResolveAlerts(engineId: string, metric: string) {
	try {
		await db
			.update(alerts)
			.set({
				status: 'resolved',
				resolvedAt: new Date()
			})
			.where(
				and(
					eq(alerts.engineId, engineId),
					eq(alerts.metric, metric),
					eq(alerts.status, 'active')
				)
			);
	} catch (e) {
		console.error('[EnergyGuard] Error auto-resolving alerts:', e);
	}
}

// Create alert from telemetry threshold violation (with deduplication)
async function createAlertFromTelemetry(
	engineId: string,
	metric: string,
	actualValue: number,
	threshold: number,
	severity: 'warning' | 'critical'
) {
	// Skip real alert creation in demo mode - use mocked alerts from seed instead
	if (env.DEMO_MODE === 'true' || env.NODE_ENV === 'development') {
		return;
	}

	const alertKey = `${engineId}:${metric}:${severity}`;
	const now = Date.now();
	const lastAlert = recentAlerts.get(alertKey);

	// Skip if we recently created an alert for this engine/metric/severity
	if (lastAlert && now - lastAlert < ALERT_COOLDOWN_MS) {
		return;
	}

	const titles: Record<string, string> = {
		temp_exhaust:
			severity === 'critical' ? 'Критическая температура выхлопа' : 'Высокая температура выхлопа',
		vibration: severity === 'critical' ? 'Критическая вибрация' : 'Повышенная вибрация'
	};

	const metricNames: Record<string, string> = {
		temp_exhaust: 'Температура выхлопа',
		vibration: 'Вибрация'
	};

	const severityLabels: Record<string, string> = {
		warning: 'предупреждения',
		critical: 'критический'
	};

	const metricName = metricNames[metric] || metric;

	await db.insert(alerts).values({
		engineId,
		severity,
		status: 'active',
		title: titles[metric] || `Алерт: ${metric}`,
		message: `${metricName}: значение ${actualValue.toFixed(1)} превышает ${severityLabels[severity]} порог ${threshold}`,
		metric,
		threshold,
		actualValue
	});

	recentAlerts.set(alertKey, now);

	// Cleanup old entries periodically
	if (recentAlerts.size > 100) {
		for (const [key, time] of recentAlerts.entries()) {
			if (now - time > ALERT_COOLDOWN_MS * 2) {
				recentAlerts.delete(key);
			}
		}
	}
}

// MQTT handler
const mqttHandler: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	if (!client && env.MQTT_URL) {
		console.log('[EnergyGuard] Initializing MQTT Client...');
		seedEngines().catch(console.error);

		client = mqtt.connect(env.MQTT_URL, {
			username: env.MQTT_USERNAME,
			password: env.MQTT_PASSWORD,
			reconnectPeriod: 5000
		});

		client.on('connect', () => {
			console.log('[EnergyGuard] MQTT Client Connected');
			client.subscribe('factory/telemetry');
			client.subscribe('factory/events');
		});

		client.on('error', (error) => {
			console.error('[EnergyGuard] MQTT Error:', error.message);
		});

		client.on('message', async (topic, message) => {
			if (topic === 'factory/telemetry') {
				try {
					const payload = JSON.parse(message.toString());

					// Validate engine_id exists
					if (!payload.engine_id || typeof payload.engine_id !== 'string') {
						console.warn('[EnergyGuard] Invalid telemetry: missing engine_id');
						return;
					}

					// Validate required values
					if (!payload.values || typeof payload.values.power !== 'number') {
						console.warn('[EnergyGuard] Invalid telemetry: missing values');
						return;
					}

					await db.insert(telemetry).values({
						time: new Date(payload.timestamp || Date.now()),
						engine_id: payload.engine_id,
						power_kw: payload.values.power ?? 0,
						temp_exhaust: payload.values.temp ?? 0,
						gas_consumption: payload.values.gas ?? 0,
						vibration: payload.values.vibration ?? 0,
						gas_pressure: payload.values.gas_pressure ?? 0
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
					} else {
						// Temperature is normal - auto-resolve any active alerts
						await autoResolveAlerts(payload.engine_id, 'temp_exhaust');
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
					} else {
						// Vibration is normal - auto-resolve any active alerts
						await autoResolveAlerts(payload.engine_id, 'vibration');
					}

					await db.update(engines).set({ status }).where(eq(engines.id, payload.engine_id));
				} catch (e) {
					console.error('[EnergyGuard] Error processing telemetry:', e);
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
					console.error('[EnergyGuard] Error processing event:', e);
				}
			}
		});
	}

	return resolve(event);
};

// Rate limiting handler
const rateLimitHandler: Handle = async ({ event, resolve }) => {
	// Try to get client IP, fallback to 'unknown' in dev mode
	let ip: string;
	try {
		ip = event.getClientAddress();
	} catch {
		// In development, getClientAddress() may throw
		ip = event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'localhost';
	}

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

	// DEMO MODE: Auto-inject demo user for all requests
	const isDemoMode = env.DEMO_MODE === 'true' || env.NODE_ENV === 'development';
	
	// Protected routes check
	if (!isPublicRoute && !session) {
		// Check for demo session cookie or demo mode
		const cookies = event.request.headers.get('cookie');
		const isDemo = isDemoMode || cookies?.includes('demo_session=true');

		if (isDemo) {
			// Inject mock user for demo session
			event.locals.user = {
				id: 'demo-user',
				email: 'admin@energyguard.io',
				emailVerified: true,
				name: 'Admin User',
				createdAt: new Date(),
				updatedAt: new Date(),
				role: 'admin'
			};
			event.locals.session = {
				id: 'demo-session',
				userId: 'demo-user',
				expiresAt: new Date(Date.now() + 86400 * 1000),
				createdAt: new Date(),
				updatedAt: new Date(),
				token: 'demo-token',
				ipAddress: event.getClientAddress(),
				userAgent: event.request.headers.get('user-agent')
			};
			return resolve(event);
		}

		// For API routes, return 401
		if (isApiRoute) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		// For page routes, redirect to login
		// DEMO MODE: Disabled redirect for presentations
		if (!isDemoMode) {
			throw redirect(302, '/login');
		}
		// In demo mode, allow access without redirect
	}

	return resolve(event);
};

// Better-auth SvelteKit handler
const betterAuthHandler: Handle = ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = sequence(rateLimitHandler, betterAuthHandler, authHandler, mqttHandler);
