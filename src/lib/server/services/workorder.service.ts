import { db } from '../db/index.js';
import { workOrders, users } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import type { WorkOrderRecord, NewWorkOrderRecord } from '../db/schema.js';

export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';

export interface WorkOrderFilters {
	status?: WorkOrderStatus;
	engineId?: string;
	priority?: WorkOrderPriority;
	assignedTo?: string;
}

export interface WorkOrderWithAssignee extends WorkOrderRecord {
	assignedToName?: string | null;
	createdByName?: string | null;
}

/**
 * Get work orders with optional filtering
 */
export async function getWorkOrders(filters?: WorkOrderFilters): Promise<WorkOrderWithAssignee[]> {
	const conditions = [];

	if (filters?.status) {
		conditions.push(eq(workOrders.status, filters.status));
	}
	if (filters?.engineId) {
		conditions.push(eq(workOrders.engineId, filters.engineId));
	}
	if (filters?.priority) {
		conditions.push(eq(workOrders.priority, filters.priority));
	}
	if (filters?.assignedTo) {
		conditions.push(eq(workOrders.assignedTo, filters.assignedTo));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const assignee = db
		.$with('assignee')
		.as(db.select({ id: users.id, name: users.name }).from(users));

	const creator = db.$with('creator').as(db.select({ id: users.id, name: users.name }).from(users));

	const result = await db
		.with(assignee, creator)
		.select({
			workOrder: workOrders,
			assignedToName: sql<
				string | null
			>`(select name from ${assignee} where id = ${workOrders.assignedTo})`,
			createdByName: sql<
				string | null
			>`(select name from ${creator} where id = ${workOrders.createdBy})`
		})
		.from(workOrders)
		.where(whereClause)
		.orderBy(desc(workOrders.createdAt))
		.limit(100);

	return result.map((row) => ({
		...row.workOrder,
		assignedToName: row.assignedToName,
		createdByName: row.createdByName
	}));
}

/**
 * Get work order statistics
 */
export async function getWorkOrderStats() {
	const result = await db
		.select({
			total: sql<number>`count(*)`,
			open: sql<number>`count(*) filter (where ${workOrders.status} = 'open')`,
			inProgress: sql<number>`count(*) filter (where ${workOrders.status} = 'in_progress')`,
			completed: sql<number>`count(*) filter (where ${workOrders.status} = 'completed')`,
			critical: sql<number>`count(*) filter (where ${workOrders.priority} = 'critical' and ${workOrders.status} != 'completed')`
		})
		.from(workOrders);

	const stats = result[0];
	return {
		total: Number(stats?.total ?? 0),
		open: Number(stats?.open ?? 0),
		in_progress: Number(stats?.inProgress ?? 0),
		completed: Number(stats?.completed ?? 0),
		critical: Number(stats?.critical ?? 0)
	};
}

/**
 * Get work order by ID
 */
export async function getWorkOrderById(workOrderId: string): Promise<WorkOrderRecord | null> {
	const [workOrder] = await db
		.select()
		.from(workOrders)
		.where(eq(workOrders.id, workOrderId))
		.limit(1);
	return workOrder ?? null;
}

/**
 * Create a new work order
 */
export async function createWorkOrder(
	data: Omit<NewWorkOrderRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WorkOrderRecord> {
	const [workOrder] = await db.insert(workOrders).values(data).returning();
	return workOrder;
}

/**
 * Update work order
 */
export async function updateWorkOrder(
	workOrderId: string,
	data: Partial<NewWorkOrderRecord>
): Promise<WorkOrderRecord | null> {
	const [workOrder] = await db
		.update(workOrders)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(workOrders.id, workOrderId))
		.returning();
	return workOrder ?? null;
}

/**
 * Update work order status
 */
export async function updateWorkOrderStatus(
	workOrderId: string,
	status: WorkOrderStatus
): Promise<boolean> {
	const updateData: Partial<WorkOrderRecord> = {
		status,
		updatedAt: new Date()
	};

	if (status === 'completed') {
		updateData.completedAt = new Date();
	}

	const result = await db
		.update(workOrders)
		.set(updateData)
		.where(eq(workOrders.id, workOrderId))
		.returning({ id: workOrders.id });

	return result.length > 0;
}

/**
 * Assign work order to user
 */
export async function assignWorkOrder(workOrderId: string, userId: string): Promise<boolean> {
	const result = await db
		.update(workOrders)
		.set({
			assignedTo: userId,
			status: 'in_progress',
			updatedAt: new Date()
		})
		.where(eq(workOrders.id, workOrderId))
		.returning({ id: workOrders.id });

	return result.length > 0;
}

/**
 * Delete work order
 */
export async function deleteWorkOrder(workOrderId: string): Promise<boolean> {
	const result = await db
		.delete(workOrders)
		.where(eq(workOrders.id, workOrderId))
		.returning({ id: workOrders.id });
	return result.length > 0;
}
