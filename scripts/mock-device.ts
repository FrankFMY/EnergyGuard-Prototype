import mqtt from 'mqtt';

// Настройки подключения из переменных окружения
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

const client = mqtt.connect(MQTT_URL, {
	username: MQTT_USERNAME || undefined,
	password: MQTT_PASSWORD || undefined,
	reconnectPeriod: 5000
});

const engines = [
	{ id: 'gpu-1', model: 'Weichai 16VCN' },
	{ id: 'gpu-2', model: 'Weichai 16VCN' }, // Bad boy
	{ id: 'gpu-3', model: 'Yuchai YC16V' },
	{ id: 'gpu-4', model: 'Yuchai YC16V' },
	{ id: 'gpu-5', model: 'Jenbacher J620' },
	{ id: 'gpu-6', model: 'Jenbacher J620' }
];

// State for Engine 2 scenario
let cycleTime = 0;
const SCENARIO_CYCLE = 120; // 2 minutes cycle

client.on('connect', () => {
	console.log(`✅ Connected to MQTT Broker: ${MQTT_URL}`);

	// Publish every second
	setInterval(simulate, 1000);
});

client.on('error', (err) => {
	console.error('❌ MQTT Error:', err.message);
});

client.on('reconnect', () => {
	console.log('🔄 Reconnecting to MQTT...');
});

function simulate() {
	const timestamp = new Date().toISOString();
	cycleTime = (cycleTime + 1) % SCENARIO_CYCLE;

	engines.forEach((engine) => {
		let power = 1000; // kW
		let temp = 480; // °C
		let gas = 250; // m3/h
		let vibration = 2.5; // mm/s
		let gas_pressure = 4.2; // bar

		if (engine.id === 'gpu-2') {
			// Scenario: Vibration -> Temp -> Power Drop

			// Phase 1: Vibration Anomaly (0-30s)
			if (cycleTime < 30) {
				vibration = 2.5 + (cycleTime / 30) * (15 - 2.5); // Ramp to 15 mm/s
				if (cycleTime === 15) {
					publishEvent('warning', 'GPU-2: Вибрация превысила 10 мм/с', 'gpu-2');
				}
			}
			// Phase 2: Overheat (30-60s)
			else if (cycleTime < 60) {
				vibration = 15;
				temp = 480 + ((cycleTime - 30) / 30) * (560 - 480); // Ramp to 560°C
				if (cycleTime === 45) {
					publishEvent('error', 'GPU-2: Критическая температура выхлопа (>530°C)', 'gpu-2');
				}
			}
			// Phase 3: Auto-Derating (60-90s)
			else if (cycleTime < 90) {
				vibration = 15;
				temp = 560;
				power = 1000 - ((cycleTime - 60) / 30) * (1000 - 600); // Drop to 600kW
				if (cycleTime === 65) {
					publishEvent('info', 'GPU-2: Автоснижение мощности для защиты двигателя', 'gpu-2');
				}
			}
			// Phase 4: Recovery (90-120s)
			else {
				vibration = 15 - ((cycleTime - 90) / 30) * 12.5;
				temp = 560 - ((cycleTime - 90) / 30) * 80;
				power = 600 + ((cycleTime - 90) / 30) * 400;
			}
		} else {
			// Stable engines with minor noise
			power = 1000 + (Math.random() * 20 - 10);
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

	// Random background events to keep the feed alive (every ~10s)
	if (Math.random() < 0.1 && cycleTime % 10 === 0) {
		const randomEngine = engines[Math.floor(Math.random() * engines.length)];
		const messages = [
			'Проверка состояния системы: ОК',
			'Синхронизация данных завершена',
			'Давление топливного насоса в норме',
			'Цикл охлаждающего вентилятора запущен',
			'Стабильность напряжения подтверждена',
			'Задержка сети: 12мс',
			'Резервная батарея проверена'
		];
		const msg = messages[Math.floor(Math.random() * messages.length)];
		// Don't associate system messages with a specific engine sometimes
		const engineId = Math.random() > 0.3 ? randomEngine.id : undefined;
		publishEvent('info', msg, engineId);
	}
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
