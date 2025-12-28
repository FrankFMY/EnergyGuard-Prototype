import { pgTable, text, doublePrecision, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['ok', 'warning', 'error']);

export const engines = pgTable('engines', {
	id: text('id').primaryKey(),
	model: text('model').notNull(),
	status: statusEnum('status').default('ok').notNull(),
	total_hours: integer('total_hours').default(0).notNull()
});

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

export const events = pgTable('events', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
	level: text('level').notNull(), // 'info', 'warning', 'error'
	message: text('message').notNull(),
	engine_id: text('engine_id').references(() => engines.id)
});
