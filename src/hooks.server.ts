import mqtt from 'mqtt';
import { db } from '$lib/server/db/index.js';
import { telemetry, engines, events } from '$lib/server/db/schema.js';
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
	if (!client) {
		console.log('Initializing MQTT Client...');
		seedEngines().catch(console.error);

		client = mqtt.connect('mqtt://localhost:1883');

		client.on('connect', () => {
			console.log('MQTT Client Connected');
			client.subscribe('factory/telemetry');
			client.subscribe('factory/events');
		});

		client.on('message', async (topic, message) => {
			if (topic === 'factory/telemetry') {
				try {
					const payload = JSON.parse(message.toString());
					// payload: { engine_id, timestamp, values: { power, temp, gas, vibration, gas_pressure } }

					await db.insert(telemetry).values({
						time: new Date(payload.timestamp),
						engine_id: payload.engine_id,
						power_kw: payload.values.power,
						temp_exhaust: payload.values.temp,
						gas_consumption: payload.values.gas,
						vibration: payload.values.vibration,
						gas_pressure: payload.values.gas_pressure
					});

					// Simple status update based on thresholds
					let status: 'ok' | 'warning' | 'error' = 'ok';
					if (payload.values.temp > 530) status = 'error';
					else if (payload.values.temp > 500) status = 'warning';

					await db.update(engines).set({ status: status }).where(eq(engines.id, payload.engine_id));
				} catch (e) {
					console.error('Error processing telemetry:', e);
				}
			} else if (topic === 'factory/events') {
				try {
					const payload = JSON.parse(message.toString());
					// payload: { level, message, engine_id, timestamp }

					await db.insert(events).values({
						time: new Date(payload.timestamp),
						level: payload.level,
						message: payload.message,
						engine_id: payload.engine_id
					});
				} catch (e) {
					console.error('Error processing event:', e);
				}
			}
		});
	}

	return await resolve(event);
}
