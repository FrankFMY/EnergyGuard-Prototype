import type { WorkOrder, WorkOrderStatus } from '$lib/types/workorder.js';

// Mock work orders
const mockWorkOrders: WorkOrder[] = [
	{
		id: 'wo-001',
		title: 'Scheduled Oil Change',
		description: 'Regular maintenance oil change as per 2000h service interval',
		engine_id: 'gpu-1',
		status: 'open',
		priority: 'medium',
		assigned_to: null,
		created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
		completed_at: null,
		estimated_hours: 4,
		parts_required: ['Oil filter', 'Engine oil 20L']
	},
	{
		id: 'wo-002',
		title: 'Spark Plug Replacement',
		description: 'Replace all 20 spark plugs due to wear',
		engine_id: 'gpu-2',
		status: 'in_progress',
		priority: 'high',
		assigned_to: 'John Smith',
		created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
		due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
		completed_at: null,
		estimated_hours: 6,
		parts_required: ['Spark plugs x20']
	},
	{
		id: 'wo-003',
		title: 'Air Filter Inspection',
		description: 'Inspect and clean or replace air filter based on condition',
		engine_id: 'gpu-4',
		status: 'completed',
		priority: 'low',
		assigned_to: 'Mike Johnson',
		created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
		due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		estimated_hours: 2,
		parts_required: ['Air filter (if needed)']
	},
	{
		id: 'wo-004',
		title: 'Vibration Analysis',
		description: 'Investigate elevated vibration levels reported by monitoring system',
		engine_id: 'gpu-2',
		status: 'open',
		priority: 'critical',
		assigned_to: null,
		created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
		due_date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
		completed_at: null,
		estimated_hours: 3,
		parts_required: []
	}
];

export interface WorkOrderFilters {
	status?: WorkOrderStatus;
	engine_id?: string;
	priority?: string;
}

export async function getWorkOrders(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
	await new Promise((r) => setTimeout(r, 300));

	let filtered = [...mockWorkOrders];

	if (filters?.status) {
		filtered = filtered.filter((wo) => wo.status === filters.status);
	}
	if (filters?.engine_id) {
		filtered = filtered.filter((wo) => wo.engine_id === filters.engine_id);
	}
	if (filters?.priority) {
		filtered = filtered.filter((wo) => wo.priority === filters.priority);
	}

	return filtered.sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);
}

export async function getWorkOrderStats() {
	await new Promise((r) => setTimeout(r, 200));

	return {
		total: mockWorkOrders.length,
		open: mockWorkOrders.filter((wo) => wo.status === 'open').length,
		in_progress: mockWorkOrders.filter((wo) => wo.status === 'in_progress').length,
		completed: mockWorkOrders.filter((wo) => wo.status === 'completed').length,
		critical: mockWorkOrders.filter((wo) => wo.priority === 'critical' && wo.status !== 'completed')
			.length
	};
}

export async function updateWorkOrderStatus(
	workOrderId: string,
	status: WorkOrderStatus
): Promise<boolean> {
	await new Promise((r) => setTimeout(r, 300));
	const wo = mockWorkOrders.find((w) => w.id === workOrderId);
	if (wo) {
		wo.status = status;
		if (status === 'completed') {
			wo.completed_at = new Date().toISOString();
		}
		return true;
	}
	return false;
}

export interface CreateWorkOrderInput {
	title: string;
	description: string;
	engine_id: string | null;
	priority: 'low' | 'medium' | 'high' | 'critical';
	assigned_to: string | null;
	due_date: string | null;
	estimated_hours: number | null;
	parts_required: string[];
}

export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
	await new Promise((r) => setTimeout(r, 300));

	const newWorkOrder: WorkOrder = {
		id: `wo-${String(mockWorkOrders.length + 1).padStart(3, '0')}`,
		title: input.title,
		description: input.description,
		engine_id: input.engine_id,
		status: 'open',
		priority: input.priority,
		assigned_to: input.assigned_to,
		created_at: new Date().toISOString(),
		due_date: input.due_date,
		completed_at: null,
		estimated_hours: input.estimated_hours,
		parts_required: input.parts_required
	};

	mockWorkOrders.unshift(newWorkOrder);
	return newWorkOrder;
}
