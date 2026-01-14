import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getUsers, getRecentAuditLogs } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Only admins can list all users
	if (locals.user.role !== 'admin') {
		throw error(403, 'Only admins can view user list');
	}

	const includeAuditLogs = url.searchParams.get('audit') === 'true';

	const [users, auditLogs] = await Promise.all([
		getUsers(),
		includeAuditLogs ? getRecentAuditLogs(50) : Promise.resolve([])
	]);

	return json({ users, auditLogs });
};
