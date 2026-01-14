import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAlertRules, createAlertRule } from '$lib/server/services/alert.service.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async () => {
	const rules = await getAlertRules();
	return json(rules);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Only admins and operators can create rules
	if (!['admin', 'operator'].includes(locals.user.role ?? '')) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await request.json();

	// Validate required fields
	if (
		!body.name ||
		!body.metric ||
		!body.operator ||
		body.threshold === undefined ||
		!body.severity
	) {
		throw error(400, 'Missing required fields: name, metric, operator, threshold, severity');
	}

	if (!['gt', 'lt', 'gte', 'lte', 'eq'].includes(body.operator)) {
		throw error(400, 'Invalid operator');
	}

	if (!['info', 'warning', 'critical'].includes(body.severity)) {
		throw error(400, 'Invalid severity');
	}

	const rule = await createAlertRule({
		name: body.name,
		engineId: body.engineId ?? null,
		metric: body.metric,
		operator: body.operator,
		threshold: body.threshold,
		durationSeconds: body.durationSeconds ?? 60,
		severity: body.severity,
		enabled: body.enabled ?? true,
		notifyEmail: body.notifyEmail ?? true,
		notifySms: body.notifySms ?? false,
		notifyPush: body.notifyPush ?? true
	});

	await createAuditLog({
		userId: locals.user.id,
		action: 'create',
		resource: 'alert_rule',
		resourceId: rule.id,
		details: { name: rule.name, metric: rule.metric }
	});

	return json(rule, { status: 201 });
};
