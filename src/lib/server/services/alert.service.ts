import { db } from '../db/index.js';
import { alerts, alertRules, users } from '../db/schema.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import type {
	AlertRecord,
	NewAlertRecord,
	AlertRuleRecord,
	NewAlertRuleRecord
} from '../db/schema.js';

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

	try {
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
	} catch (e) {
		console.error('[ALERT SERVICE] Error fetching alerts:', e);
		return [];
	}
}

/**
 * Get alert statistics
 */
export async function getAlertStats() {
	const now = new Date();
	const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	try {
		const [totalCount, activeCount, acknowledgedCount, resolvedCount, criticalCount, warningCount] =
			await Promise.all([
				db.select({ count: sql<number>`count(*)` }).from(alerts),
				db
					.select({ count: sql<number>`count(*)` })
					.from(alerts)
					.where(eq(alerts.status, 'active')),
				db
					.select({ count: sql<number>`count(*)` })
					.from(alerts)
					.where(eq(alerts.status, 'acknowledged')),
				db
					.select({ count: sql<number>`count(*)` })
					.from(alerts)
					.where(and(eq(alerts.status, 'resolved'), gte(alerts.resolvedAt, last24h))),
				db
					.select({ count: sql<number>`count(*)` })
					.from(alerts)
					.where(and(eq(alerts.severity, 'critical'), eq(alerts.status, 'active'))),
				db
					.select({ count: sql<number>`count(*)` })
					.from(alerts)
					.where(and(eq(alerts.severity, 'warning'), eq(alerts.status, 'active')))
			]);

		return {
			total: Number(totalCount[0]?.count ?? 0),
			active: Number(activeCount[0]?.count ?? 0),
			acknowledged: Number(acknowledgedCount[0]?.count ?? 0),
			resolved: Number(resolvedCount[0]?.count ?? 0),
			critical: Number(criticalCount[0]?.count ?? 0),
			warning: Number(warningCount[0]?.count ?? 0)
		};
	} catch (e) {
		console.error('[ALERT SERVICE] Failed to get alert stats:', e);
		return {
			total: 0,
			active: 0,
			acknowledged: 0,
			resolved: 0,
			critical: 0,
			warning: 0
		};
	}
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
	const result = await db
		.delete(alertRules)
		.where(eq(alertRules.id, ruleId))
		.returning({ id: alertRules.id });
	return result.length > 0;
}
