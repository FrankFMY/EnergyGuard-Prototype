import { db } from '../db/index.js';
import { users, sessions, auditLogs } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import type { UserRecord, AuditLogRecord } from '../db/schema.js';

export type UserRole = 'admin' | 'operator' | 'technician' | 'viewer';

export interface UserWithStats extends UserRecord {
	sessionCount?: number;
}

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<UserWithStats[]> {
	const result = await db
		.select({
			user: users,
			sessionCount: sql<number>`(
				select count(*) from ${sessions} 
				where ${sessions.userId} = ${users.id} 
				and ${sessions.expiresAt} > now()
			)`
		})
		.from(users)
		.orderBy(users.name);

	return result.map((row) => ({
		...row.user,
		sessionCount: Number(row.sessionCount)
	}));
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserRecord | null> {
	const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	return user ?? null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	return user ?? null;
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<UserRecord | null> {
	const [user] = await db
		.update(users)
		.set({ role, updatedAt: new Date() })
		.where(eq(users.id, userId))
		.returning();
	return user ?? null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
	userId: string,
	data: { name?: string; image?: string }
): Promise<UserRecord | null> {
	const [user] = await db
		.update(users)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(users.id, userId))
		.returning();
	return user ?? null;
}

/**
 * Delete user (admin only) - also deletes sessions and accounts via cascade
 */
export async function deleteUser(userId: string): Promise<boolean> {
	const result = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
	return result.length > 0;
}

// ==================== AUDIT LOGS ====================

export interface CreateAuditLogInput {
	userId?: string | null;
	action: string;
	resource: string;
	resourceId?: string;
	details?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: CreateAuditLogInput): Promise<AuditLogRecord> {
	const [log] = await db.insert(auditLogs).values(data).returning();
	return log;
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogsByUser(userId: string, limit = 50): Promise<AuditLogRecord[]> {
	return db
		.select()
		.from(auditLogs)
		.where(eq(auditLogs.userId, userId))
		.orderBy(desc(auditLogs.createdAt))
		.limit(limit);
}

/**
 * Get audit logs for a resource
 */
export async function getAuditLogsByResource(
	resource: string,
	resourceId: string,
	limit = 50
): Promise<AuditLogRecord[]> {
	return db
		.select()
		.from(auditLogs)
		.where(sql`${auditLogs.resource} = ${resource} and ${auditLogs.resourceId} = ${resourceId}`)
		.orderBy(desc(auditLogs.createdAt))
		.limit(limit);
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(limit = 100): Promise<(AuditLogRecord & { userName?: string })[]> {
	const result = await db
		.select({
			log: auditLogs,
			userName: users.name
		})
		.from(auditLogs)
		.leftJoin(users, eq(auditLogs.userId, users.id))
		.orderBy(desc(auditLogs.createdAt))
		.limit(limit);

	return result.map((row) => ({
		...row.log,
		userName: row.userName ?? undefined
	}));
}
