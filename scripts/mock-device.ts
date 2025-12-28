import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

const engines = [
	{ id: 'gpu-1', model: 'Jenbacher J420' },
	{ id: 'gpu-2', model: 'Jenbacher J420' }, // Bad boy
	{ id: 'gpu-3', model: 'Jenbacher J420' },
	{ id: 'gpu-4', model: 'Jenbacher J420' },
	{ id: 'gpu-5', model: 'Jenbacher J420' },
	{ id: 'gpu-6', model: 'Jenbacher J420' }
];

// State for Engine 2 scenario
let engine2Time = 0;
const ENGINE2_CYCLE = 60; // 60 seconds cycle for demo

client.on('connect', () => {
	console.log('Connected to MQTT Broker');

	// Publish every second
	setInterval(simulate, 1000);
});

function simulate() {
	const timestamp = new Date().toISOString();
	engine2Time = (engine2Time + 1) % ENGINE2_CYCLE;

	engines.forEach((engine) => {
		let power = 1200; // kW
		let temp = 480; // °C
		let gas = 300; // m3/h

		if (engine.id === 'gpu-2') {
			// Scenario: Overheat & Power Drop
			// 0-30s: Ramp up temp 480 -> 540
			if (engine2Time < 30) {
				temp = 480 + (engine2Time / 30) * (540 - 480);
				power = 1200;
			}
			// 30-50s: High temp, Power drop
			else if (engine2Time < 50) {
				temp = 540;
				power = 950; // Drop power due to overheat
			}
			// 50-60s: Cooldown
			else {
				temp = 540 - ((engine2Time - 50) / 10) * (540 - 480);
				power = 950 + ((engine2Time - 50) / 10) * (1200 - 950);
			}
		} else {
			// Random noise
			power = 1200 + (Math.random() * 20 - 10);
			temp = 480 + (Math.random() * 10 - 5);
		}

		// Add some noise to gas consumption relative to power
		gas = power / 4 + (Math.random() * 5 - 2.5);

		const payload = {
			engine_id: engine.id,
			timestamp: Date.now(), // unix timestamp ms
			values: {
				power: parseFloat(power.toFixed(2)),
				temp: parseFloat(temp.toFixed(2)),
				gas: parseFloat(gas.toFixed(2))
			}
		};

		client.publish('factory/telemetry', JSON.stringify(payload));
	});

	process.stdout.write(
		`\r[${timestamp}] Published telemetry for ${engines.length} engines (Cycle: ${engine2Time}s)`
	);
}
