import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from '$lib/types/workorder.js';

export interface WorkOrderFilters {
	status?: WorkOrderStatus;
	engine_id?: string;
	priority?: WorkOrderPriority;
}

/**
 * Fetch work orders from API with optional filters
 */
export async function getWorkOrders(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
	const params = new URLSearchParams();
	if (filters?.status) params.set('status', filters.status);
	if (filters?.engine_id) params.set('engine_id', filters.engine_id);
	if (filters?.priority) params.set('priority', filters.priority);

	const response = await fetch(`/api/workorders?${params.toString()}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch work orders: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Get work order statistics
 */
export async function getWorkOrderStats() {
	const response = await fetch('/api/workorders/stats');
	if (!response.ok) {
		throw new Error(`Failed to fetch work order stats: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Update work order status
 */
export async function updateWorkOrderStatus(
	workOrderId: string,
	status: WorkOrderStatus
): Promise<boolean> {
	const response = await fetch(`/api/workorders/${workOrderId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status })
	});
	return response.ok;
}

export interface CreateWorkOrderInput {
	title: string;
	description: string;
	engine_id: string | null;
	priority: WorkOrderPriority;
	assigned_to: string | null;
	due_date: string | null;
	estimated_hours: number | null;
	parts_required: string[];
}

/**
 * Create a new work order
 */
export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
	const response = await fetch('/api/workorders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	if (!response.ok) {
		throw new Error(`Failed to create work order: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Get single work order by ID
 */
export async function getWorkOrder(id: string): Promise<WorkOrder> {
	const response = await fetch(`/api/workorders/${id}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch work order: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Delete a work order
 */
export async function deleteWorkOrder(id: string): Promise<boolean> {
	const response = await fetch(`/api/workorders/${id}`, {
		method: 'DELETE'
	});
	return response.ok;
}
