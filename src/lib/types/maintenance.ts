import { z } from 'zod';

// Service type definitions
export const ServiceTypeSchema = z.enum(['minor', 'major', 'overhaul']);
export type ServiceType = z.infer<typeof ServiceTypeSchema>;

// Service type constants with metadata
export const SERVICE_TYPES = {
	minor: {
		name: 'Minor Service',
		nameRu: 'Малое ТО',
		interval: 500,
		baseCost: 50000
	},
	major: {
		name: 'Major Service',
		nameRu: 'Большое ТО',
		interval: 2000,
		baseCost: 250000
	},
	overhaul: {
		name: 'Overhaul',
		nameRu: 'Капремонт',
		interval: 8000,
		baseCost: 2000000
	}
} as const;

// Maintenance schedule entry
export const MaintenanceScheduleSchema = z.object({
	id: z.string(),
	engine_id: z.string(),
	service_type: ServiceTypeSchema,
	due_date: z.coerce.date(),
	estimated_cost: z.number().nonnegative(),
	parts_required: z.array(
		z.object({
			part_id: z.string(),
			name: z.string(),
			quantity: z.number().int().positive()
		})
	),
	completed: z.boolean().default(false)
});

export type MaintenanceSchedule = z.infer<typeof MaintenanceScheduleSchema>;

// Spare parts inventory
export const SparePartSchema = z.object({
	id: z.string(),
	name: z.string(),
	quantity: z.number().int().nonnegative(),
	min_quantity: z.number().int().nonnegative(),
	unit_cost: z.number().nonnegative()
});

export type SparePart = z.infer<typeof SparePartSchema>;

// Downtime record for Block 1
export const DowntimeSchema = z.object({
	id: z.string(),
	engine_id: z.string(),
	start_time: z.coerce.date(),
	end_time: z.coerce.date().nullable(),
	reason: z.string(),
	loss_rub: z.number().nonnegative()
});

export type Downtime = z.infer<typeof DowntimeSchema>;

// Urgency levels
export const UrgencySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Urgency = z.infer<typeof UrgencySchema>;

// Maintenance forecast for display
export const MaintenanceForecastSchema = z.object({
	engine_id: z.string(),
	model: z.string(),
	total_hours: z.number().int().nonnegative(),
	next_service_date: z.string(),
	hours_remaining: z.number().int(),
	days_remaining: z.number().int(),
	estimated_cost: z.number().nonnegative(),
	parts_available: z.boolean(),
	urgency: UrgencySchema
});

export type MaintenanceForecast = z.infer<typeof MaintenanceForecastSchema>;
