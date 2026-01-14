import { z } from 'zod';

// Raw telemetry data point
export const TelemetrySchema = z.object({
	time: z.coerce.date(),
	engine_id: z.string(),
	power_kw: z.number().nonnegative(),
	temp_exhaust: z.number(),
	gas_consumption: z.number().nonnegative(),
	vibration: z.number().nonnegative(),
	gas_pressure: z.number().nonnegative()
});
export type Telemetry = z.infer<typeof TelemetrySchema>;

// Telemetry for charts (simplified)
export const ChartDataPointSchema = z.object({
	time: z.string(),
	temp: z.number(),
	power: z.number()
});
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;

// Latest telemetry (from DISTINCT ON query)
export const LatestTelemetrySchema = z.object({
	engine_id: z.string(),
	power_kw: z.number(),
	temp_exhaust: z.number(),
	gas_consumption: z.number(),
	vibration: z.number(),
	gas_pressure: z.number().optional()
});
export type LatestTelemetry = z.infer<typeof LatestTelemetrySchema>;

// MQTT payload from devices
export const MQTTTelemetryPayloadSchema = z.object({
	engine_id: z.string(),
	timestamp: z.number(),
	values: z.object({
		power: z.number(),
		temp: z.number(),
		gas: z.number(),
		vibration: z.number(),
		gas_pressure: z.number()
	})
});
export type MQTTTelemetryPayload = z.infer<typeof MQTTTelemetryPayloadSchema>;
