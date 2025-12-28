import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

const engines = [
	{ id: 'gpu-1', model: 'Jenbacher J420' },
	{ id: 'gpu-2', model: 'Jenbacher J420' }, // Bad boy
	{ id: 'gpu-3', model: 'Jenbacher J624' },
	{ id: 'gpu-4', model: 'Jenbacher J420' },
	{ id: 'gpu-5', model: 'Jenbacher J420' },
	{ id: 'gpu-6', model: 'Jenbacher J420' }
];

// State for Engine 2 scenario
let cycleTime = 0;
const SCENARIO_CYCLE = 120; // 2 minutes cycle

client.on('connect', () => {
	console.log('Connected to MQTT Broker');

	// Publish every second
	setInterval(simulate, 1000);
});

function simulate() {
	const timestamp = new Date().toISOString();
	cycleTime = (cycleTime + 1) % SCENARIO_CYCLE;

	engines.forEach((engine) => {
		let power = 1200; // kW
		let temp = 480; // °C
		let gas = 300; // m3/h
		let vibration = 2.5; // mm/s
		let gas_pressure = 4.2; // bar

		if (engine.id === 'gpu-2') {
			// Scenario: Vibration -> Temp -> Power Drop

			// Phase 1: Vibration Anomaly (0-30s)
			if (cycleTime < 30) {
				vibration = 2.5 + (cycleTime / 30) * (15 - 2.5); // Ramp to 15 mm/s
				if (cycleTime === 15) {
					publishEvent('warning', 'GPU-2: Vibration rising above 10mm/s', 'gpu-2');
				}
			}
			// Phase 2: Overheat (30-60s)
			else if (cycleTime < 60) {
				vibration = 15;
				temp = 480 + ((cycleTime - 30) / 30) * (560 - 480); // Ramp to 560°C
				if (cycleTime === 45) {
					publishEvent('error', 'GPU-2: Exhaust Temp Critical (>530°C)', 'gpu-2');
				}
			}
			// Phase 3: Auto-Derating (60-90s)
			else if (cycleTime < 90) {
				vibration = 15;
				temp = 560;
				power = 1200 - ((cycleTime - 60) / 30) * (1200 - 800); // Drop to 800kW
				if (cycleTime === 65) {
					publishEvent('info', 'GPU-2: Auto-derating active to protect engine', 'gpu-2');
				}
			}
			// Phase 4: Recovery (90-120s)
			else {
				vibration = 15 - ((cycleTime - 90) / 30) * 12.5;
				temp = 560 - ((cycleTime - 90) / 30) * 80;
				power = 800 + ((cycleTime - 90) / 30) * 400;
			}
		} else {
			// Stable engines with minor noise
			power = (engine.model === 'Jenbacher J624' ? 1500 : 1200) + (Math.random() * 20 - 10);
			temp = 480 + (Math.random() * 10 - 5);
			vibration = 2.0 + Math.random() * 0.5;
			gas_pressure = 4.0 + Math.random() * 0.2;
		}

		// Add some noise to gas consumption relative to power
		gas = power / 4 + (Math.random() * 5 - 2.5);

		const payload = {
			engine_id: engine.id,
			timestamp: Date.now(),
			values: {
				power: parseFloat(power.toFixed(2)),
				temp: parseFloat(temp.toFixed(2)),
				gas: parseFloat(gas.toFixed(2)),
				vibration: parseFloat(vibration.toFixed(2)),
				gas_pressure: parseFloat(gas_pressure.toFixed(2))
			}
		};

		client.publish('factory/telemetry', JSON.stringify(payload));
	});

	process.stdout.write(`\r[${timestamp}] Simulating... Cycle: ${cycleTime}s`);
}

function publishEvent(level: string, message: string, engine_id?: string) {
	const event = {
		level,
		message,
		engine_id,
		timestamp: Date.now()
	};
	client.publish('factory/events', JSON.stringify(event));
	console.log(`\n[EVENT] ${level.toUpperCase()}: ${message}`);
}
