import { db } from '../db/index.js';
import { telemetry } from '../db/schema.js';
import { eq, desc, and, gte } from 'drizzle-orm';
import type { ChartDataPoint } from '$lib/types/index.js';

/**
 * Get telemetry history for a specific engine
 * @param engineId - Engine identifier
 * @param minutes - How many minutes of history to fetch (default: 5)
 * @param limit - Maximum number of records (default: 300)
 */
export async function getTelemetryHistory(
	engineId: string,
	minutes: number = 5,
	limit: number = 300
): Promise<ChartDataPoint[]> {
	const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

	const history = await db
		.select({
			time: telemetry.time,
			power: telemetry.power_kw,
			temp: telemetry.temp_exhaust
		})
		.from(telemetry)
		.where(and(eq(telemetry.engine_id, engineId), gte(telemetry.time, cutoffTime)))
		.orderBy(desc(telemetry.time))
		.limit(limit);

	// Return in chronological order and format for JSON
	return history.reverse().map((row) => ({
		time: row.time.toISOString(),
		power: Number(row.power),
		temp: Number(row.temp)
	}));
}

/**
 * Get latest telemetry for a specific engine
 */
export async function getLatestTelemetryForEngine(engineId: string) {
	const result = await db
		.select()
		.from(telemetry)
		.where(eq(telemetry.engine_id, engineId))
		.orderBy(desc(telemetry.time))
		.limit(1);

	return result[0] ?? null;
}

/**
 * Calculate average metrics for a time period
 */
export async function getAverageMetrics(engineId: string, hours: number = 24) {
	const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

	const history = await db
		.select({
			power: telemetry.power_kw,
			temp: telemetry.temp_exhaust,
			gas: telemetry.gas_consumption
		})
		.from(telemetry)
		.where(and(eq(telemetry.engine_id, engineId), gte(telemetry.time, cutoffTime)));

	if (history.length === 0) {
		return { avgPower: 0, avgTemp: 0, avgGas: 0 };
	}

	const avgPower = history.reduce((sum, r) => sum + Number(r.power), 0) / history.length;
	const avgTemp = history.reduce((sum, r) => sum + Number(r.temp), 0) / history.length;
	const avgGas = history.reduce((sum, r) => sum + Number(r.gas), 0) / history.length;

	return { avgPower, avgTemp, avgGas };
}
