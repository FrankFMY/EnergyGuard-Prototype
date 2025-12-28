import { z } from 'zod';
import { EngineWithMetricsSchema } from './engine.js';
import { EventDisplaySchema } from './event.js';

// Dashboard summary statistics
export const DashboardSummarySchema = z.object({
	totalPowerMW: z.number().nonnegative(),
	totalPlannedMW: z.number().nonnegative(),
	efficiency: z.number().min(0).max(100),
	currentLoss: z.number().nonnegative(),
	enginesOnline: z.number().int().nonnegative(),
	enginesTotal: z.number().int().nonnegative(),
	enginesWarning: z.number().int().nonnegative(),
	enginesError: z.number().int().nonnegative()
});

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

// Full dashboard API response
export const DashboardDataSchema = z.object({
	engines: z.array(EngineWithMetricsSchema),
	summary: DashboardSummarySchema,
	events: z.array(EventDisplaySchema)
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;

// History API response
export const HistoryResponseSchema = z.array(
	z.object({
		time: z.string(),
		power: z.number(),
		temp: z.number()
	})
);

export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;

// Economics data for Block 5
export const CostBreakdownSchema = z.object({
	gas: z.number().nonnegative(),
	depreciation: z.number().nonnegative(),
	spare_parts: z.number().nonnegative(),
	labor: z.number().nonnegative(),
	other: z.number().nonnegative(),
	total: z.number().nonnegative(),
	cost_per_kwh: z.number().nonnegative()
});

export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

// OEE metrics for Block 3
export const OEEMetricsSchema = z.object({
	availability: z.number().min(0).max(100),
	performance: z.number().min(0).max(100),
	quality: z.number().min(0).max(100),
	oee: z.number().min(0).max(100),
	planned_kwh: z.number().nonnegative(),
	actual_kwh: z.number().nonnegative(),
	gas_consumption_m3: z.number().nonnegative(),
	specific_consumption: z.number().nonnegative() // m³/kWh
});

export type OEEMetrics = z.infer<typeof OEEMetricsSchema>;

// API error response
export const APIErrorSchema = z.object({
	error: z.string(),
	code: z.string().optional(),
	details: z.record(z.string(), z.unknown()).optional()
});

export type APIError = z.infer<typeof APIErrorSchema>;
