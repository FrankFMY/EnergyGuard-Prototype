import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { engines, telemetry } from '$lib/server/db/schema.js';
import { sql } from 'drizzle-orm';

interface TelemetryRow {
	engine_id: string;
	power_kw: number;
	temp_exhaust: number;
	gas_consumption: number;
}

export async function GET() {
	const PLANNED_MW_PER_ENGINE = 1.2; // 1200 kW
	const TARIFF_RUB = 5000; // Example tariff per MWh lost?

	// Fetch all engines
	const allEngines = await db.select().from(engines);

	// Fetch latest telemetry for each engine
	// Using Postgres DISTINCT ON to get latest reading per engine
	const latestTelemetry = await db.execute<TelemetryRow>(sql`
        SELECT DISTINCT ON (engine_id) 
            engine_id, 
            power_kw, 
            temp_exhaust, 
            gas_consumption 
        FROM ${telemetry} 
        ORDER BY engine_id, time DESC
    `);

	// Map telemetry to engines
	const engineData = allEngines.map((eng) => {
		// Use type assertion for the find result if necessary, but typing the execute result is better
		const tel = latestTelemetry.find((t) => t.engine_id === eng.id);
		const power_kw = tel ? Number(tel.power_kw) : 0;
		const temp = tel ? Number(tel.temp_exhaust) : 0;
		const gas = tel ? Number(tel.gas_consumption) : 0;

		return {
			id: eng.id,
			model: eng.model,
			status: eng.status,
			total_hours: eng.total_hours,
			power_kw,
			temp,
			gas
		};
	});

	// Calculate aggregates
	const totalPowerMW = engineData.reduce((sum, e) => sum + e.power_kw / 1000, 0);
	const totalPlannedMW = allEngines.length * PLANNED_MW_PER_ENGINE;

	// Efficiency (Mock calculation: Actual Power / (Gas * Factor) or just Power vs Plan?)
	// User said: "Average efficiency vs Plan".
	// Let's use % of Load vs Plan.
	const efficiency = totalPlannedMW > 0 ? (totalPowerMW / totalPlannedMW) * 100 : 0;

	// Loss calculation
	// Loss only if Fact < Plan
	const powerDeficitMW = Math.max(0, totalPlannedMW - totalPowerMW);
	const currentLoss = powerDeficitMW * TARIFF_RUB;

	return json({
		engines: engineData,
		summary: {
			totalPowerMW,
			efficiency,
			currentLoss,
			totalPlannedMW
		}
	});
}
