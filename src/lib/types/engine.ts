import { z } from 'zod';

// Engine status enum
export const EngineStatusSchema = z.enum(['ok', 'warning', 'error']);
export type EngineStatus = z.infer<typeof EngineStatusSchema>;

// Base engine from database
export const EngineSchema = z.object({
	id: z.string(),
	model: z.string(),
	status: EngineStatusSchema,
	total_hours: z.number().int().nonnegative(),
	planned_power_kw: z.number().positive().default(1200)
});

export type Engine = z.infer<typeof EngineSchema>;

// Engine with calculated metrics for dashboard
export const EngineWithMetricsSchema = EngineSchema.extend({
	power_kw: z.number().nonnegative(),
	temp: z.number(),
	vibration: z.number().nonnegative(),
	gas_consumption: z.number().nonnegative(),
	gas_pressure: z.number().nonnegative(),
	profit_rate: z.number(),
	efficiency: z.number().min(0).max(100)
});

export type EngineWithMetrics = z.infer<typeof EngineWithMetricsSchema>;

// Alias for backward compatibility
export type EngineWithTelemetry = EngineWithMetrics;

// Engine models available
export const ENGINE_MODELS = ['Jenbacher J420', 'Jenbacher J624', 'Caterpillar G3520'] as const;
export type EngineModel = (typeof ENGINE_MODELS)[number];

// Constants for calculations
export const ENGINE_CONSTANTS = {
	TARIFF_RUB_PER_KWH: 4.5,
	GAS_COST_RUB_PER_M3: 6.0,
	PLANNED_MW_PER_ENGINE: 1.2,
	SERVICE_INTERVAL_HOURS: 2000,
	CRITICAL_TEMP_THRESHOLD: 520,
	WARNING_TEMP_THRESHOLD: 500,
	CRITICAL_VIBRATION_THRESHOLD: 15,
	WARNING_VIBRATION_THRESHOLD: 10
} as const;
