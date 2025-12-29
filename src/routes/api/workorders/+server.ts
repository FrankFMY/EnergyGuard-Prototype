import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getWorkOrders,
	getWorkOrderStats,
	createWorkOrder,
	type WorkOrderFilters,
	type WorkOrderStatus,
	type WorkOrderPriority
} from '$lib/server/services/workorder.service.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ url }) => {
	const filters: WorkOrderFilters = {};

	const status = url.searchParams.get('status');
	if (status && ['open', 'in_progress', 'completed', 'cancelled'].includes(status)) {
		filters.status = status as WorkOrderStatus;
	}

	const priority = url.searchParams.get('priority');
	if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
		filters.priority = priority as WorkOrderPriority;
	}

	const engineId = url.searchParams.get('engine_id');
	if (engineId) {
		filters.engineId = engineId;
	}

	const assignedTo = url.searchParams.get('assigned_to');
	if (assignedTo) {
		filters.assignedTo = assignedTo;
	}

	const [workOrders, stats] = await Promise.all([getWorkOrders(filters), getWorkOrderStats()]);

	return json({ workOrders, stats });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Only admins, operators, and technicians can create work orders
	if (!['admin', 'operator', 'technician'].includes(locals.user.role ?? '')) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await request.json();

	if (!body.title) {
		throw error(400, 'Title is required');
	}

	const workOrder = await createWorkOrder({
		title: body.title,
		description: body.description ?? null,
		engineId: body.engineId ?? null,
		priority: body.priority ?? 'medium',
		assignedTo: body.assignedTo ?? null,
		createdBy: locals.user.id,
		dueDate: body.dueDate ? new Date(body.dueDate) : null,
		estimatedHours: body.estimatedHours ?? null,
		partsRequired: body.partsRequired ?? []
	});

	await createAuditLog({
		userId: locals.user.id,
		action: 'create',
		resource: 'work_order',
		resourceId: workOrder.id,
		details: { title: workOrder.title, priority: workOrder.priority }
	});

	return json(workOrder, { status: 201 });
};
