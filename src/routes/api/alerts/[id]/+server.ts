import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getAlertById,
	acknowledgeAlert,
	resolveAlert
} from '$lib/server/services/alert.service.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ params }) => {
	const alert = await getAlertById(params.id);

	if (!alert) {
		throw error(404, 'Alert not found');
	}

	// Transform to client format
	return json({
		id: alert.id,
		engine_id: alert.engineId,
		severity: alert.severity,
		status: alert.status,
		title: alert.title,
		message: alert.message,
		metric: alert.metric,
		threshold: alert.threshold,
		actual_value: alert.actualValue,
		created_at: alert.createdAt?.toISOString(),
		acknowledged_at: alert.acknowledgedAt?.toISOString() ?? null,
		resolved_at: alert.resolvedAt?.toISOString() ?? null,
		acknowledged_by: alert.acknowledgedBy ?? null
	});
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const alert = await getAlertById(params.id);
	if (!alert) {
		throw error(404, 'Alert not found');
	}

	const body = await request.json();

	// Support both formats: { status: 'acknowledged' } and { action: 'acknowledge' }
	const newStatus =
		body.status ??
		(body.action === 'acknowledge'
			? 'acknowledged'
			: body.action === 'resolve'
				? 'resolved'
				: null);

	if (newStatus === 'acknowledged') {
		const success = await acknowledgeAlert(params.id, locals.user.id);
		if (!success) {
			throw error(400, 'Cannot acknowledge this alert');
		}

		await createAuditLog({
			userId: locals.user.id,
			action: 'acknowledge',
			resource: 'alert',
			resourceId: params.id,
			details: { title: alert.title }
		});

		const updated = await getAlertById(params.id);
		return json(
			updated
				? {
						id: updated.id,
						engine_id: updated.engineId,
						severity: updated.severity,
						status: updated.status,
						title: updated.title,
						message: updated.message,
						created_at: updated.createdAt?.toISOString(),
						acknowledged_at: updated.acknowledgedAt?.toISOString() ?? null,
						resolved_at: updated.resolvedAt?.toISOString() ?? null
					}
				: {}
		);
	}

	if (newStatus === 'resolved') {
		const success = await resolveAlert(params.id, locals.user.id);
		if (!success) {
			throw error(400, 'Cannot resolve this alert');
		}

		await createAuditLog({
			userId: locals.user.id,
			action: 'resolve',
			resource: 'alert',
			resourceId: params.id,
			details: { title: alert.title }
		});

		const updated = await getAlertById(params.id);
		return json(
			updated
				? {
						id: updated.id,
						engine_id: updated.engineId,
						severity: updated.severity,
						status: updated.status,
						title: updated.title,
						message: updated.message,
						created_at: updated.createdAt?.toISOString(),
						acknowledged_at: updated.acknowledgedAt?.toISOString() ?? null,
						resolved_at: updated.resolvedAt?.toISOString() ?? null
					}
				: {}
		);
	}

	throw error(400, 'Invalid status. Use "acknowledged" or "resolved"');
};
