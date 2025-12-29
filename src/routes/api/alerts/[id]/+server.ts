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

	return json(alert);
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
	const action = body.action;

	if (action === 'acknowledge') {
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
		return json(updated);
	}

	if (action === 'resolve') {
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
		return json(updated);
	}

	throw error(400, 'Invalid action. Use "acknowledge" or "resolve"');
};
