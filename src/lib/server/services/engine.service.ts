import { db } from '../db/index.js';
import { engines, telemetry, downtimes } from '../db/schema.js';
import { sql, desc } from 'drizzle-orm';
import type { Engine, EngineWithMetrics, DashboardSummary } from '$lib/types/index.js';
import { ENGINE_CONSTANTS } from '$lib/types/index.js';
import { getLatestEvents } from './event.service.js';
import { cache, CACHE_KEYS, CACHE_TTL } from '../cache.js';

/**
 * Get recent downtimes
 */
export async function getRecentDowntimes(limit: number = 5) {
	return db.select().from(downtimes).orderBy(desc(downtimes.start_time)).limit(limit);
}

interface TelemetryRow {
	engine_id: string;
	power_kw: number;
	temp_exhaust: number;
	gas_consumption: number;
	vibration: number;
	gas_pressure: number;
	[key: string]: unknown;
}

/**
 * Get all engines from database
 * CACHED: Results are cached for 30 seconds to reduce database load
 */
export async function getAllEngines(): Promise<Engine[]> {
	return cache.getOrSet(
		CACHE_KEYS.ENGINES_LIST,
		async () => {
			const result = await db
				.select({
					id: engines.id,
					model: engines.model,
					status: engines.status,
					total_hours: engines.total_hours
				})
				.from(engines);

			return result.map((e) => ({
				...e,
				planned_power_kw: 1200 // Default - column doesn't exist in DB yet
			}));
		},
		CACHE_TTL.MEDIUM // 30 seconds
	);
}

/**
 * Get latest telemetry for all engines
 * OPTIMIZED: Uses LATERAL JOIN for O(n) performance instead of O(n*m) with DISTINCT ON
 * CACHED: Results are cached for 2 seconds to reduce database load
 *
 * Why LATERAL JOIN is faster:
 * - DISTINCT ON scans entire telemetry table and sorts
 * - LATERAL JOIN does index lookup per engine (uses idx_telemetry_engine_time)
 * - For 6 engines with millions of telemetry rows: LATERAL = 6 index lookups vs full table scan
 */
export async function getLatestTelemetry(): Promise<Map<string, TelemetryRow>> {
	// Try cache first (2 second TTL for near real-time data)
	const cacheKey = 'energyguard:telemetry:latest';
	const cached = await cache.get<Record<string, TelemetryRow>>(cacheKey);
	if (cached) {
		return new Map(Object.entries(cached));
	}

	// LATERAL JOIN: For each engine, get latest telemetry row using index
	// This is O(engines) instead of O(telemetry_rows) - much faster!
	const result = await db.execute<TelemetryRow>(sql`
		SELECT
			e.id as engine_id,
			COALESCE(t.power_kw, 0) as power_kw,
			COALESCE(t.temp_exhaust, 0) as temp_exhaust,
			COALESCE(t.gas_consumption, 0) as gas_consumption,
			COALESCE(t.vibration, 0) as vibration,
			COALESCE(t.gas_pressure, 0) as gas_pressure
		FROM ${engines} e
		LEFT JOIN LATERAL (
			SELECT power_kw, temp_exhaust, gas_consumption, vibration, gas_pressure
			FROM ${telemetry}
			WHERE engine_id = e.id
			ORDER BY time DESC
			LIMIT 1
		) t ON true
	`);

	const telemetryMap = new Map<string, TelemetryRow>();
	const telemetryObj: Record<string, TelemetryRow> = {};
	for (const row of result) {
		telemetryMap.set(row.engine_id, row);
		telemetryObj[row.engine_id] = row;
	}

	// Cache as object (Map doesn't serialize well to JSON)
	await cache.set(cacheKey, telemetryObj, CACHE_TTL.SHORT);

	return telemetryMap;
}

/**
 * Calculate profit rate for an engine
 * Formula: (Power * Price) - (Gas * Cost)
 */
export function calculateProfitRate(power_kw: number, gas_consumption: number): number {
	const revenue = power_kw * ENGINE_CONSTANTS.TARIFF_RUB_PER_KWH;
	const cost = gas_consumption * ENGINE_CONSTANTS.GAS_COST_RUB_PER_M3;
	return revenue - cost;
}

/**
 * Calculate efficiency percentage
 * Based on power output vs gas consumption ratio
 */
export function calculateEfficiency(power_kw: number, gas_consumption: number): number {
	if (gas_consumption <= 0) return 0;
	// Normalized efficiency: power / (gas * factor)
	return Math.min(100, (power_kw / (gas_consumption * 4)) * 100);
}

/**
 * Get engines with calculated metrics for dashboard
 */
export async function getEnginesWithMetrics(): Promise<EngineWithMetrics[]> {
	const allEngines = await getAllEngines();
	const telemetryMap = await getLatestTelemetry();

	return allEngines.map((engine) => {
		const tel = telemetryMap.get(engine.id);
		const power_kw = tel ? Number(tel.power_kw) : 0;
		const temp = tel ? Number(tel.temp_exhaust) : 0;
		const gas_consumption = tel ? Number(tel.gas_consumption) : 0;
		const vibration = tel ? Number(tel.vibration) : 0;
		const gas_pressure = tel ? Number(tel.gas_pressure) : 0;

		const profit_rate = calculateProfitRate(power_kw, gas_consumption);
		const efficiency = calculateEfficiency(power_kw, gas_consumption);

		return {
			...engine,
			power_kw,
			temp,
			gas_consumption,
			vibration,
			gas_pressure,
			profit_rate,
			efficiency
		};
	});
}

/**
 * Calculate dashboard summary from engine metrics
 */
export function calculateDashboardSummary(engineData: EngineWithMetrics[]): DashboardSummary {
	const totalPowerMW = engineData.reduce((sum, e) => sum + e.power_kw / 1000, 0);
	const totalPlannedMW = engineData.length * ENGINE_CONSTANTS.PLANNED_MW_PER_ENGINE;

	const efficiency = totalPlannedMW > 0 ? (totalPowerMW / totalPlannedMW) * 100 : 0;

	// Calculate losses
	const downtimeLoss = Math.max(0, totalPlannedMW - totalPowerMW) * 5000; // TARIFF_RUB
	const inefficiencyLoss = engineData.reduce((sum, e) => {
		return e.efficiency < 40 ? sum + 500 : sum;
	}, 0);
	const currentLoss = downtimeLoss + inefficiencyLoss;

	// Count by status
	const enginesOnline = engineData.filter((e) => e.status === 'ok').length;
	const enginesWarning = engineData.filter((e) => e.status === 'warning').length;
	const enginesError = engineData.filter((e) => e.status === 'error').length;

	return {
		totalPowerMW,
		totalPlannedMW,
		efficiency,
		currentLoss,
		enginesOnline,
		enginesTotal: engineData.length,
		enginesWarning,
		enginesError
	};
}

/**
 * Get full dashboard data
 * OPTIMIZED: Uses cached telemetry data for better performance
 * CACHED: Full dashboard response is cached for 2 seconds for real-time feel
 */
export async function getDashboardData() {
	return cache.getOrSet(
		CACHE_KEYS.DASHBOARD_DATA,
		async () => {
			// Use cached telemetry (already cached in getLatestTelemetry)
			const [engineData, eventData] = await Promise.all([
				getEnginesWithMetrics(),
				getLatestEvents(10)
			]);
			const summary = calculateDashboardSummary(engineData);

			return {
				engines: engineData,
				events: eventData,
				summary
			};
		},
		CACHE_TTL.SHORT // 2 seconds - dashboard feels real-time
	);
}
