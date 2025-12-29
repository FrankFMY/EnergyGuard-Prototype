import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getAlerts,
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

	const alerts = await getAlerts(filters);

	// Transform to client format
	const clientAlerts = alerts.map((a) => ({
		id: a.id,
		engine_id: a.engineId,
		severity: a.severity,
		status: a.status,
		title: a.title,
		message: a.message,
		metric: a.metric,
		threshold: a.threshold,
		actual_value: a.actualValue,
		created_at: a.createdAt?.toISOString(),
		acknowledged_at: a.acknowledgedAt?.toISOString() ?? null,
		resolved_at: a.resolvedAt?.toISOString() ?? null,
		acknowledged_by: a.acknowledgedByName ?? null
	}));

	return json(clientAlerts);
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
