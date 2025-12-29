import { db } from '../db/index.js';
import { alerts, alertRules, users } from '../db/schema.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import type { AlertRecord, NewAlertRecord, AlertRuleRecord, NewAlertRuleRecord } from '../db/schema.js';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface AlertFilters {
	severity?: AlertSeverity;
	status?: AlertStatus;
	engineId?: string;
	hours?: number;
}

export interface AlertWithAcknowledger extends AlertRecord {
	acknowledgedByName?: string | null;
}

/**
 * Get alerts with optional filtering
 */
export async function getAlerts(filters?: AlertFilters): Promise<AlertWithAcknowledger[]> {
	const conditions = [];

	if (filters?.severity) {
		conditions.push(eq(alerts.severity, filters.severity));
	}
	if (filters?.status) {
		conditions.push(eq(alerts.status, filters.status));
	}
	if (filters?.engineId) {
		conditions.push(eq(alerts.engineId, filters.engineId));
	}
	if (filters?.hours) {
		const cutoff = new Date(Date.now() - filters.hours * 60 * 60 * 1000);
		conditions.push(gte(alerts.createdAt, cutoff));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const result = await db
		.select({
			alert: alerts,
			acknowledgerName: users.name
		})
		.from(alerts)
		.leftJoin(users, eq(alerts.acknowledgedBy, users.id))
		.where(whereClause)
		.orderBy(desc(alerts.createdAt))
		.limit(100);

	return result.map((row) => ({
		...row.alert,
		acknowledgedByName: row.acknowledgerName
	}));
}

/**
 * Get alert statistics
 */
export async function getAlertStats() {
	const now = new Date();
	const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	const result = await db
		.select({
			total: sql<number>`count(*)`,
			active: sql<number>`count(*) filter (where ${alerts.status} = 'active')`,
			acknowledged: sql<number>`count(*) filter (where ${alerts.status} = 'acknowledged')`,
			resolved: sql<number>`count(*) filter (where ${alerts.status} = 'resolved' and ${alerts.resolvedAt} >= ${last24h})`,
			critical: sql<number>`count(*) filter (where ${alerts.severity} = 'critical' and ${alerts.status} = 'active')`,
			warning: sql<number>`count(*) filter (where ${alerts.severity} = 'warning' and ${alerts.status} = 'active')`
		})
		.from(alerts);

	const stats = result[0];
	return {
		total: Number(stats?.total ?? 0),
		active: Number(stats?.active ?? 0),
		acknowledged: Number(stats?.acknowledged ?? 0),
		resolved: Number(stats?.resolved ?? 0),
		critical: Number(stats?.critical ?? 0),
		warning: Number(stats?.warning ?? 0)
	};
}

/**
 * Create a new alert
 */
export async function createAlert(data: NewAlertRecord): Promise<AlertRecord> {
	const [alert] = await db.insert(alerts).values(data).returning();
	return alert;
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
	const result = await db
		.update(alerts)
		.set({
			status: 'acknowledged',
			acknowledgedAt: new Date(),
			acknowledgedBy: userId
		})
		.where(and(eq(alerts.id, alertId), eq(alerts.status, 'active')))
		.returning({ id: alerts.id });

	return result.length > 0;
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string, userId: string): Promise<boolean> {
	const result = await db
		.update(alerts)
		.set({
			status: 'resolved',
			resolvedAt: new Date(),
			acknowledgedBy: sql`coalesce(${alerts.acknowledgedBy}, ${userId})`,
			acknowledgedAt: sql`coalesce(${alerts.acknowledgedAt}, now())`
		})
		.where(and(eq(alerts.id, alertId), sql`${alerts.status} != 'resolved'`))
		.returning({ id: alerts.id });

	return result.length > 0;
}

/**
 * Get alert by ID
 */
export async function getAlertById(alertId: string): Promise<AlertRecord | null> {
	const [alert] = await db.select().from(alerts).where(eq(alerts.id, alertId)).limit(1);
	return alert ?? null;
}

// ==================== ALERT RULES ====================

/**
 * Get all alert rules
 */
export async function getAlertRules(): Promise<AlertRuleRecord[]> {
	return db.select().from(alertRules).orderBy(alertRules.name);
}

/**
 * Create alert rule
 */
export async function createAlertRule(data: NewAlertRuleRecord): Promise<AlertRuleRecord> {
	const [rule] = await db.insert(alertRules).values(data).returning();
	return rule;
}

/**
 * Update alert rule
 */
export async function updateAlertRule(
	ruleId: string,
	data: Partial<NewAlertRuleRecord>
): Promise<AlertRuleRecord | null> {
	const [rule] = await db
		.update(alertRules)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(alertRules.id, ruleId))
		.returning();
	return rule ?? null;
}

/**
 * Toggle alert rule enabled status
 */
export async function toggleAlertRule(ruleId: string): Promise<boolean> {
	const result = await db
		.update(alertRules)
		.set({
			enabled: sql`not ${alertRules.enabled}`,
			updatedAt: new Date()
		})
		.where(eq(alertRules.id, ruleId))
		.returning({ id: alertRules.id });

	return result.length > 0;
}

/**
 * Delete alert rule
 */
export async function deleteAlertRule(ruleId: string): Promise<boolean> {
	const result = await db.delete(alertRules).where(eq(alertRules.id, ruleId)).returning({ id: alertRules.id });
	return result.length > 0;
}
