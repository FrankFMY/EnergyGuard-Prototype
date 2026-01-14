import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { toggleAlertRule } from '$lib/server/services/alert.service.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const PATCH: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'Rule ID is required');
	}

	const success = await toggleAlertRule(id);
	if (!success) {
		throw error(404, 'Alert rule not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'update',
		resource: 'alert_rule',
		resourceId: id,
		details: { action: 'toggle' }
	});

	return json({ success: true });
};
