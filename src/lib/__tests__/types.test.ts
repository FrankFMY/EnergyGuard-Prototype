import { describe, it, expect } from 'vitest';
import {
	EngineSchema,
	EngineStatusSchema,
	EngineWithMetricsSchema,
	ENGINE_CONSTANTS
} from '../types/engine.js';
import { TelemetrySchema } from '../types/telemetry.js';
import { EventSchema, EventLevelSchema } from '../types/event.js';
import { AlertSchema, AlertSeveritySchema, AlertStatusSchema } from '../types/alert.js';

describe('Engine Types', () => {
	describe('EngineStatusSchema', () => {
		it('accepts valid statuses', () => {
			expect(EngineStatusSchema.parse('ok')).toBe('ok');
			expect(EngineStatusSchema.parse('warning')).toBe('warning');
			expect(EngineStatusSchema.parse('error')).toBe('error');
		});

		it('rejects invalid statuses', () => {
			expect(() => EngineStatusSchema.parse('invalid')).toThrow();
			expect(() => EngineStatusSchema.parse('')).toThrow();
		});
	});

	describe('EngineSchema', () => {
		it('validates a valid engine', () => {
			const engine = {
				id: 'gpu-1',
				model: 'Jenbacher J420',
				status: 'ok',
				total_hours: 1500
			};
			expect(EngineSchema.parse(engine)).toMatchObject(engine);
		});

		it('applies default planned_power_kw', () => {
			const engine = {
				id: 'gpu-1',
				model: 'Jenbacher J420',
				status: 'ok',
				total_hours: 1500
			};
			const parsed = EngineSchema.parse(engine);
			expect(parsed.planned_power_kw).toBe(1200);
		});

		it('rejects negative hours', () => {
			const engine = {
				id: 'gpu-1',
				model: 'Jenbacher J420',
				status: 'ok',
				total_hours: -100
			};
			expect(() => EngineSchema.parse(engine)).toThrow();
		});

		it('rejects missing required fields', () => {
			expect(() => EngineSchema.parse({ id: 'gpu-1' })).toThrow();
			expect(() => EngineSchema.parse({ model: 'Test' })).toThrow();
		});
	});

	describe('EngineWithMetricsSchema', () => {
		it('validates engine with metrics', () => {
			const engine = {
				id: 'gpu-1',
				model: 'Jenbacher J420',
				status: 'ok',
				total_hours: 1500,
				power_kw: 1150,
				temp: 485,
				vibration: 5.2,
				gas_consumption: 280,
				gas_pressure: 2.5,
				profit_rate: 45000,
				efficiency: 95.8
			};
			expect(EngineWithMetricsSchema.parse(engine)).toMatchObject(engine);
		});

		it('rejects efficiency > 100', () => {
			const engine = {
				id: 'gpu-1',
				model: 'Jenbacher J420',
				status: 'ok',
				total_hours: 1500,
				power_kw: 1150,
				temp: 485,
				vibration: 5.2,
				gas_consumption: 280,
				gas_pressure: 2.5,
				profit_rate: 45000,
				efficiency: 150
			};
			expect(() => EngineWithMetricsSchema.parse(engine)).toThrow();
		});
	});

	describe('ENGINE_CONSTANTS', () => {
		it('has correct values', () => {
			expect(ENGINE_CONSTANTS.TARIFF_RUB_PER_KWH).toBe(4.5);
			expect(ENGINE_CONSTANTS.SERVICE_INTERVAL_HOURS).toBe(2000);
			expect(ENGINE_CONSTANTS.CRITICAL_TEMP_THRESHOLD).toBe(520);
			expect(ENGINE_CONSTANTS.WARNING_TEMP_THRESHOLD).toBe(500);
		});
	});
});

describe('Telemetry Types', () => {
	describe('TelemetrySchema', () => {
		it('validates telemetry data', () => {
			const telemetry = {
				time: new Date().toISOString(),
				engine_id: 'gpu-1',
				power_kw: 1150,
				temp_exhaust: 485,
				gas_consumption: 280,
				vibration: 5.2,
				gas_pressure: 2.5
			};
			expect(TelemetrySchema.parse(telemetry)).toMatchObject({
				engine_id: 'gpu-1',
				power_kw: 1150
			});
		});
	});
});

describe('Event Types', () => {
	describe('EventLevelSchema', () => {
		it('accepts valid levels', () => {
			expect(EventLevelSchema.parse('info')).toBe('info');
			expect(EventLevelSchema.parse('warning')).toBe('warning');
			expect(EventLevelSchema.parse('error')).toBe('error');
		});
	});

	describe('EventSchema', () => {
		it('validates event data', () => {
			const event = {
				id: 'evt-1',
				time: new Date().toISOString(),
				level: 'warning',
				message: 'High temperature detected',
				engine_id: 'gpu-1'
			};
			expect(EventSchema.parse(event)).toMatchObject({
				level: 'warning',
				message: 'High temperature detected'
			});
		});
	});
});

describe('Alert Types', () => {
	describe('AlertSeveritySchema', () => {
		it('accepts valid severities', () => {
			expect(AlertSeveritySchema.parse('info')).toBe('info');
			expect(AlertSeveritySchema.parse('warning')).toBe('warning');
			expect(AlertSeveritySchema.parse('critical')).toBe('critical');
		});
	});

	describe('AlertStatusSchema', () => {
		it('accepts valid statuses', () => {
			expect(AlertStatusSchema.parse('active')).toBe('active');
			expect(AlertStatusSchema.parse('acknowledged')).toBe('acknowledged');
			expect(AlertStatusSchema.parse('resolved')).toBe('resolved');
		});
	});

	describe('AlertSchema', () => {
		it('validates alert data', () => {
			const alert = {
				id: 'alert-1',
				severity: 'critical',
				status: 'active',
				title: 'High Temperature',
				message: 'Exhaust temperature exceeded threshold',
				engine_id: 'gpu-1',
				metric: null,
				threshold: null,
				actual_value: null,
				created_at: new Date().toISOString(),
				acknowledged_at: null,
				resolved_at: null,
				acknowledged_by: null
			};
			expect(AlertSchema.parse(alert)).toMatchObject({
				severity: 'critical',
				status: 'active'
			});
		});
	});
});
