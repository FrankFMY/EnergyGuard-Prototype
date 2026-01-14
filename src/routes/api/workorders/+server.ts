import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getWorkOrders,
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

	const workOrders = await getWorkOrders(filters);

	// Transform to client format
	const clientWorkOrders = workOrders.map((wo) => ({
		id: wo.id,
		title: wo.title,
		description: wo.description,
		engine_id: wo.engineId,
		status: wo.status,
		priority: wo.priority,
		assigned_to: wo.assignedToName ?? null,
		created_at: wo.createdAt?.toISOString(),
		due_date: wo.dueDate?.toISOString() ?? null,
		completed_at: wo.completedAt?.toISOString() ?? null,
		estimated_hours: wo.estimatedHours,
		parts_required: wo.partsRequired ?? []
	}));

	return json(clientWorkOrders);
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
		engineId: body.engine_id ?? null,
		priority: body.priority ?? 'medium',
		assignedTo: body.assigned_to ?? null,
		createdBy: locals.user.id,
		dueDate: body.due_date ? new Date(body.due_date) : null,
		estimatedHours: body.estimated_hours ?? null,
		partsRequired: body.parts_required ?? []
	});

	await createAuditLog({
		userId: locals.user.id,
		action: 'create',
		resource: 'work_order',
		resourceId: workOrder.id,
		details: { title: workOrder.title, priority: workOrder.priority }
	});

	// Transform to client format
	return json(
		{
			id: workOrder.id,
			title: workOrder.title,
			description: workOrder.description,
			engine_id: workOrder.engineId,
			status: workOrder.status,
			priority: workOrder.priority,
			assigned_to: body.assigned_to ?? null,
			created_at: workOrder.createdAt?.toISOString(),
			due_date: workOrder.dueDate?.toISOString() ?? null,
			completed_at: null,
			estimated_hours: workOrder.estimatedHours,
			parts_required: workOrder.partsRequired ?? []
		},
		{ status: 201 }
	);
};
