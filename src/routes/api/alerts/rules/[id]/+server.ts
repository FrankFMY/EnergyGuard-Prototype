import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	updateAlertRule,
	toggleAlertRule,
	deleteAlertRule
} from '$lib/server/services/alert.service.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!['admin', 'operator'].includes(locals.user.role ?? '')) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await request.json();

	// Toggle action
	if (body.action === 'toggle') {
		const success = await toggleAlertRule(params.id);
		if (!success) {
			throw error(404, 'Rule not found');
		}

		await createAuditLog({
			userId: locals.user.id,
			action: 'toggle',
			resource: 'alert_rule',
			resourceId: params.id
		});

		return json({ success: true });
	}

	// Update rule
	const rule = await updateAlertRule(params.id, body);
	if (!rule) {
		throw error(404, 'Rule not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'update',
		resource: 'alert_rule',
		resourceId: params.id,
		details: body
	});

	return json(rule);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (locals.user.role !== 'admin') {
		throw error(403, 'Only admins can delete rules');
	}

	const success = await deleteAlertRule(params.id);
	if (!success) {
		throw error(404, 'Rule not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'delete',
		resource: 'alert_rule',
		resourceId: params.id
	});

	return json({ success: true });
};
