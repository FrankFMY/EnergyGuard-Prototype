import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getWorkOrderById,
	updateWorkOrder,
	updateWorkOrderStatus,
	assignWorkOrder,
	deleteWorkOrder,
	type WorkOrderStatus
} from '$lib/server/services/workorder.service.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ params }) => {
	const workOrder = await getWorkOrderById(params.id);

	if (!workOrder) {
		throw error(404, 'Work order not found');
	}

	return json(workOrder);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const workOrder = await getWorkOrderById(params.id);
	if (!workOrder) {
		throw error(404, 'Work order not found');
	}

	const body = await request.json();

	// Handle status update
	if (body.status) {
		const validStatuses: WorkOrderStatus[] = ['open', 'in_progress', 'completed', 'cancelled'];
		if (!validStatuses.includes(body.status)) {
			throw error(400, 'Invalid status');
		}

		const success = await updateWorkOrderStatus(params.id, body.status);
		if (!success) {
			throw error(400, 'Failed to update status');
		}

		await createAuditLog({
			userId: locals.user.id,
			action: 'update_status',
			resource: 'work_order',
			resourceId: params.id,
			details: { oldStatus: workOrder.status, newStatus: body.status }
		});

		const updated = await getWorkOrderById(params.id);
		return json(updated);
	}

	// Handle assignment
	if (body.assignedTo !== undefined) {
		const success = await assignWorkOrder(params.id, body.assignedTo);
		if (!success) {
			throw error(400, 'Failed to assign work order');
		}

		await createAuditLog({
			userId: locals.user.id,
			action: 'assign',
			resource: 'work_order',
			resourceId: params.id,
			details: { assignedTo: body.assignedTo }
		});

		const updated = await getWorkOrderById(params.id);
		return json(updated);
	}

	// General update
	const updated = await updateWorkOrder(params.id, {
		title: body.title,
		description: body.description,
		priority: body.priority,
		dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
		estimatedHours: body.estimatedHours,
		actualHours: body.actualHours,
		partsRequired: body.partsRequired,
		notes: body.notes
	});

	if (!updated) {
		throw error(400, 'Failed to update work order');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'update',
		resource: 'work_order',
		resourceId: params.id,
		details: body
	});

	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!['admin', 'operator'].includes(locals.user.role ?? '')) {
		throw error(403, 'Insufficient permissions');
	}

	const success = await deleteWorkOrder(params.id);
	if (!success) {
		throw error(404, 'Work order not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'delete',
		resource: 'work_order',
		resourceId: params.id
	});

	return json({ success: true });
};
