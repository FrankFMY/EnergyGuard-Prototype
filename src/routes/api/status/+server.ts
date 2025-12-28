import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { engines, telemetry, events } from '$lib/server/db/schema.js';
import { sql, desc } from 'drizzle-orm';

interface TelemetryRow extends Record<string, unknown> {
	engine_id: string;
	power_kw: number;
	temp_exhaust: number;
	gas_consumption: number;
	vibration: number;
}

export async function GET() {
	const PLANNED_MW_PER_ENGINE = 1.2; // 1200 kW
	const TARIFF_RUB = 5000;

	// Fetch all engines
	const allEngines = await db.select().from(engines);

	// Fetch latest telemetry for each engine
	const latestTelemetry = await db.execute<TelemetryRow>(sql`
        SELECT DISTINCT ON (engine_id) 
            engine_id, 
            power_kw, 
            temp_exhaust, 
            gas_consumption,
            vibration
        FROM ${telemetry} 
        ORDER BY engine_id, time DESC
    `);

	// Fetch latest 10 events
	const latestEvents = await db.select().from(events).orderBy(desc(events.time)).limit(10);

	// Map telemetry to engines
	const engineData = allEngines.map((eng) => {
		const tel = latestTelemetry.find((t) => t.engine_id === eng.id);
		const power_kw = tel ? Number(tel.power_kw) : 0;
		const temp = tel ? Number(tel.temp_exhaust) : 0;
		const gas = tel ? Number(tel.gas_consumption) : 0;
		const vibration = tel ? Number(tel.vibration) : 0;

		// Calculate Profitability per engine
		// Mock Formula: (Power * Price) - (Gas * Cost)
		// Price = 4.5 RUB/kWh, Gas = 6.0 RUB/m3
		const revenue = power_kw * 4.5;
		const cost = gas * 6.0;
		const profit_rate = revenue - cost;

		// Efficiency % (Mock: Power / Gas ratio normalized)
		const efficiency = gas > 0 ? (power_kw / (gas * 4)) * 100 : 0;

		return {
			id: eng.id,
			model: eng.model,
			status: eng.status,
			total_hours: eng.total_hours,
			power_kw,
			temp,
			vibration,
			profit_rate,
			efficiency
		};
	});

	// Calculate aggregates
	const totalPowerMW = engineData.reduce((sum, e) => sum + e.power_kw / 1000, 0);
	const totalPlannedMW = allEngines.length * PLANNED_MW_PER_ENGINE;

	const efficiency = totalPlannedMW > 0 ? (totalPowerMW / totalPlannedMW) * 100 : 0;

	// Hidden Loss Calculation (Inefficiency + Downtime)
	const downtimeLoss = Math.max(0, totalPlannedMW - totalPowerMW) * TARIFF_RUB;
	// Inefficiency loss: Engines running below 40% efficiency
	const inefficiencyLoss = engineData.reduce((sum, e) => {
		return e.efficiency < 40 ? sum + 500 : sum;
	}, 0);

	const currentLoss = downtimeLoss + inefficiencyLoss;

	return json({
		engines: engineData,
		summary: {
			totalPowerMW,
			efficiency,
			currentLoss,
			totalPlannedMW
		},
		events: latestEvents
	});
}
