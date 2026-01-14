import {
	pgTable,
	text,
	doublePrecision,
	integer,
	timestamp,
	pgEnum,
	boolean,
	jsonb,
	index
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
export const userRoleEnum = pgEnum('user_role', ['admin', 'operator', 'technician', 'viewer']);
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical']);
export const alertStatusEnum = pgEnum('alert_status', ['active', 'acknowledged', 'resolved']);
export const workOrderStatusEnum = pgEnum('work_order_status', [
	'open',
	'in_progress',
	'completed',
	'cancelled'
]);
export const workOrderPriorityEnum = pgEnum('work_order_priority', [
	'low',
	'medium',
	'high',
	'critical'
]);

// ==================== BETTER-AUTH TABLES ====================

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	role: userRoleEnum('role').default('viewer').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const accounts = pgTable('accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const verifications = pgTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ==================== AUDIT LOG ====================

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id').references(() => users.id),
		action: text('action').notNull(), // 'login', 'logout', 'create', 'update', 'delete'
		resource: text('resource').notNull(), // 'engine', 'alert', 'workorder', etc.
		resourceId: text('resource_id'),
		details: jsonb('details').$type<Record<string, unknown>>(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('idx_audit_logs_user_id').on(table.userId)]
);

// Engines table
export const engines = pgTable('engines', {
	id: text('id').primaryKey(),
	model: text('model').notNull(),
	status: statusEnum('status').default('ok').notNull(),
	total_hours: integer('total_hours').default(0).notNull()
});

// Telemetry table (time-series data) with indexes
export const telemetry = pgTable(
	'telemetry',
	{
		time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
		engine_id: text('engine_id')
			.references(() => engines.id)
			.notNull(),
		power_kw: doublePrecision('power_kw').notNull(),
		temp_exhaust: doublePrecision('temp_exhaust').notNull(),
		gas_consumption: doublePrecision('gas_consumption').notNull(),
		vibration: doublePrecision('vibration').default(0).notNull(),
		gas_pressure: doublePrecision('gas_pressure').default(0).notNull()
	},
	(table) => [index('idx_telemetry_engine_time').on(table.engine_id, table.time)]
);

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

// ==================== ALERTS ====================

export const alerts = pgTable(
	'alerts',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		engineId: text('engine_id').references(() => engines.id),
		severity: alertSeverityEnum('severity').notNull(),
		status: alertStatusEnum('status').default('active').notNull(),
		title: text('title').notNull(),
		message: text('message').notNull(),
		metric: text('metric'), // 'temp_exhaust', 'vibration', etc.
		threshold: doublePrecision('threshold'),
		actualValue: doublePrecision('actual_value'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
		resolvedAt: timestamp('resolved_at', { withTimezone: true }),
		acknowledgedBy: text('acknowledged_by').references(() => users.id)
	},
	(table) => [
		index('idx_alerts_engine_id').on(table.engineId),
		index('idx_alerts_status').on(table.status),
		index('idx_alerts_created_at').on(table.createdAt)
	]
);

// Alert rules for configuration
export const alertRules = pgTable('alert_rules', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	engineId: text('engine_id').references(() => engines.id), // null = applies to all
	metric: text('metric').notNull(),
	operator: text('operator').notNull(), // 'gt', 'lt', 'gte', 'lte', 'eq'
	threshold: doublePrecision('threshold').notNull(),
	durationSeconds: integer('duration_seconds').default(60).notNull(),
	severity: alertSeverityEnum('severity').notNull(),
	enabled: boolean('enabled').default(true).notNull(),
	notifyEmail: boolean('notify_email').default(true).notNull(),
	notifySms: boolean('notify_sms').default(false).notNull(),
	notifyPush: boolean('notify_push').default(true).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ==================== WORK ORDERS ====================

export const workOrders = pgTable(
	'work_orders',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		title: text('title').notNull(),
		description: text('description'),
		engineId: text('engine_id').references(() => engines.id),
		status: workOrderStatusEnum('status').default('open').notNull(),
		priority: workOrderPriorityEnum('priority').default('medium').notNull(),
		assignedTo: text('assigned_to').references(() => users.id),
		createdBy: text('created_by').references(() => users.id),
		dueDate: timestamp('due_date', { withTimezone: true }),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		estimatedHours: doublePrecision('estimated_hours'),
		actualHours: doublePrecision('actual_hours'),
		partsRequired: jsonb('parts_required').$type<string[]>().default([]),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('idx_work_orders_status').on(table.status),
		index('idx_work_orders_engine_id').on(table.engineId),
		index('idx_work_orders_assigned_to').on(table.assignedTo)
	]
);

// Type exports for Drizzle
export type EngineRecord = typeof engines.$inferSelect;
export type NewEngineRecord = typeof engines.$inferInsert;
export type TelemetryRecord = typeof telemetry.$inferSelect;
export type EventRecord = typeof events.$inferSelect;
export type DowntimeRecord = typeof downtimes.$inferSelect;
export type SparePartRecord = typeof spareParts.$inferSelect;
export type MaintenanceScheduleRecord = typeof maintenanceSchedules.$inferSelect;
export type CostRecordRecord = typeof costRecords.$inferSelect;

// Auth types
export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type SessionRecord = typeof sessions.$inferSelect;
export type AccountRecord = typeof accounts.$inferSelect;
export type AuditLogRecord = typeof auditLogs.$inferSelect;

// Alert types
export type AlertRecord = typeof alerts.$inferSelect;
export type NewAlertRecord = typeof alerts.$inferInsert;
export type AlertRuleRecord = typeof alertRules.$inferSelect;
export type NewAlertRuleRecord = typeof alertRules.$inferInsert;

// Work order types
export type WorkOrderRecord = typeof workOrders.$inferSelect;
export type NewWorkOrderRecord = typeof workOrders.$inferInsert;
