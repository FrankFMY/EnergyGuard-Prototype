import mqtt from 'mqtt';
import { db } from '$lib/server/db/index.js';
import { telemetry, engines } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

let client: mqtt.MqttClient;

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
	console.log('Engines seeded');
}

export async function handle({ event, resolve }) {
	// Initialize MQTT on first request (or server start roughly)
	// Note: SvelteKit hooks run on every request, but global state persists in Node/Bun.
	// We check if client is defined to avoid re-connecting.

	if (!client) {
		console.log('Initializing MQTT Client...');
		// Ensure engines exist
		seedEngines().catch(console.error);

		client = mqtt.connect('mqtt://localhost:1883');

		client.on('connect', () => {
			console.log('MQTT Client Connected');
			client.subscribe('factory/telemetry');
		});

		client.on('message', async (topic, message) => {
			if (topic === 'factory/telemetry') {
				try {
					const payload = JSON.parse(message.toString());
					// payload: { engine_id, timestamp, values: { power, temp, gas } }

					// Insert telemetry
					await db.insert(telemetry).values({
						time: new Date(payload.timestamp),
						engine_id: payload.engine_id,
						power_kw: payload.values.power,
						temp_exhaust: payload.values.temp,
						gas_consumption: payload.values.gas
					});

					// Update engine status logic (Simple threshold)
					let status: 'ok' | 'warning' | 'error' = 'ok';
					if (payload.values.temp > 530) status = 'error';
					else if (payload.values.temp > 500) status = 'warning';

					await db
						.update(engines)
						.set({
							status: status
							// simple increment logic for hours isn't accurate here, but we could update last seen
						})
						.where(eq(engines.id, payload.engine_id));
				} catch (e) {
					console.error('Error processing MQTT message:', e);
				}
			}
		});
	}

	return await resolve(event);
}
