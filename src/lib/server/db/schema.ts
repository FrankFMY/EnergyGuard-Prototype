import {
	pgTable,
	text,
	doublePrecision,
	integer,
	timestamp,
	pgEnum,
	boolean,
	jsonb
} from 'drizzle-orm/pg-core';

// Enums
export const statusEnum = pgEnum('status', ['ok', 'warning', 'error']);
export const eventLevelEnum = pgEnum('event_level', ['info', 'warning', 'error']);
export const serviceTypeEnum = pgEnum('service_type', [
	'oil_change',
	'filter_replacement',
	'spark_plug',
	'major_overhaul',
	'inspection'
]);

// Engines table
export const engines = pgTable('engines', {
	id: text('id').primaryKey(),
	model: text('model').notNull(),
	status: statusEnum('status').default('ok').notNull(),
	total_hours: integer('total_hours').default(0).notNull()
});

// Telemetry table (time-series data)
export const telemetry = pgTable('telemetry', {
	time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
	engine_id: text('engine_id')
		.references(() => engines.id)
		.notNull(),
	power_kw: doublePrecision('power_kw').notNull(),
	temp_exhaust: doublePrecision('temp_exhaust').notNull(),
	gas_consumption: doublePrecision('gas_consumption').notNull(),
	vibration: doublePrecision('vibration').default(0).notNull(),
	gas_pressure: doublePrecision('gas_pressure').default(0).notNull()
});

// Events table
export const events = pgTable('events', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
	level: text('level').notNull(), // 'info', 'warning', 'error'
	message: text('message').notNull(),
	engine_id: text('engine_id').references(() => engines.id)
});

// Downtimes table (for tracking engine stops)
export const downtimes = pgTable('downtimes', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	engine_id: text('engine_id')
		.references(() => engines.id)
		.notNull(),
	start_time: timestamp('start_time', { withTimezone: true }).notNull(),
	end_time: timestamp('end_time', { withTimezone: true }),
	reason: text('reason'),
	loss_rub: doublePrecision('loss_rub')
});

// Spare parts inventory
export const spareParts = pgTable('spare_parts', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	part_number: text('part_number'),
	quantity: integer('quantity').default(0).notNull(),
	min_quantity: integer('min_quantity').default(5).notNull(),
	unit_cost: doublePrecision('unit_cost')
});

// Part requirements type for JSONB
export interface PartRequirement {
	part_id: string;
	quantity_needed: number;
}

// Maintenance schedules
export const maintenanceSchedules = pgTable('maintenance_schedules', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	engine_id: text('engine_id')
		.references(() => engines.id)
		.notNull(),
	service_type: serviceTypeEnum('service_type').notNull(),
	due_date: timestamp('due_date', { withTimezone: true }),
	due_hours: integer('due_hours').notNull(),
	estimated_cost: doublePrecision('estimated_cost').default(0).notNull(),
	parts_required: jsonb('parts_required').$type<PartRequirement[]>().default([]),
	completed: boolean('completed').default(false).notNull(),
	completed_at: timestamp('completed_at', { withTimezone: true })
});

// Cost records for economics tracking
export const costRecords = pgTable('cost_records', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
	category: text('category').notNull(), // 'gas', 'depreciation', 'spare_parts', 'labor', 'other'
	amount: doublePrecision('amount').notNull(),
	engine_id: text('engine_id').references(() => engines.id),
	description: text('description')
});

// Type exports for Drizzle
export type EngineRecord = typeof engines.$inferSelect;
export type NewEngineRecord = typeof engines.$inferInsert;
export type TelemetryRecord = typeof telemetry.$inferSelect;
export type EventRecord = typeof events.$inferSelect;
export type DowntimeRecord = typeof downtimes.$inferSelect;
export type SparePartRecord = typeof spareParts.$inferSelect;
export type MaintenanceScheduleRecord = typeof maintenanceSchedules.$inferSelect;
export type CostRecordRecord = typeof costRecords.$inferSelect;
