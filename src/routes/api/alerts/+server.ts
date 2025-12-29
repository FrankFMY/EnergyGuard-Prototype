import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getAlerts,
	getAlertStats,
	createAlert,
	type AlertFilters,
	type AlertSeverity,
	type AlertStatus
} from '$lib/server/services/alert.service.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ url }) => {
	const filters: AlertFilters = {};

	const severity = url.searchParams.get('severity');
	if (severity && ['info', 'warning', 'critical'].includes(severity)) {
		filters.severity = severity as AlertSeverity;
	}

	const status = url.searchParams.get('status');
	if (status && ['active', 'acknowledged', 'resolved'].includes(status)) {
		filters.status = status as AlertStatus;
	}

	const engineId = url.searchParams.get('engine_id');
	if (engineId) {
		filters.engineId = engineId;
	}

	const hours = url.searchParams.get('hours');
	if (hours) {
		filters.hours = parseInt(hours, 10);
	}

	const [alerts, stats] = await Promise.all([getAlerts(filters), getAlertStats()]);

	return json({ alerts, stats });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();

	// Validate required fields
	if (!body.title || !body.message || !body.severity) {
		throw error(400, 'Missing required fields: title, message, severity');
	}

	if (!['info', 'warning', 'critical'].includes(body.severity)) {
		throw error(400, 'Invalid severity. Must be info, warning, or critical');
	}

	const alert = await createAlert({
		engineId: body.engineId ?? null,
		severity: body.severity,
		status: 'active',
		title: body.title,
		message: body.message,
		metric: body.metric ?? null,
		threshold: body.threshold ?? null,
		actualValue: body.actualValue ?? null
	});

	// Audit log
	await createAuditLog({
		userId: locals.user.id,
		action: 'create',
		resource: 'alert',
		resourceId: alert.id,
		details: { title: alert.title, severity: alert.severity }
	});

	return json(alert, { status: 201 });
};
