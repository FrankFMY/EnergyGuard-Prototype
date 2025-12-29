import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAllEngines, getEnginesWithMetrics } from '$lib/server/services/engine.service.js';
import { db } from '$lib/server/db/index.js';
import { engines } from '$lib/server/db/schema.js';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ url }) => {
	const withMetrics = url.searchParams.get('metrics') === 'true';

	if (withMetrics) {
		const enginesData = await getEnginesWithMetrics();
		return json(enginesData);
	}

	const enginesData = await getAllEngines();
	return json(enginesData);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (locals.user.role !== 'admin') {
		throw error(403, 'Only admins can add engines');
	}

	const body = await request.json();

	if (!body.id || !body.model) {
		throw error(400, 'Engine ID and model are required');
	}

	// Validate ID format
	const id = body.id.toLowerCase().replace(/\s+/g, '-');
	if (!/^[a-z0-9-]+$/.test(id)) {
		throw error(400, 'Invalid engine ID format');
	}

	try {
		const [engine] = await db
			.insert(engines)
			.values({
				id,
				model: body.model,
				status: 'ok',
				total_hours: body.total_hours ?? 0
			})
			.returning();

		await createAuditLog({
			userId: locals.user.id,
			action: 'create',
			resource: 'engine',
			resourceId: engine.id,
			details: { model: engine.model }
		});

		return json(engine, { status: 201 });
	} catch (e) {
		if (e instanceof Error && e.message.includes('duplicate')) {
			throw error(409, 'Engine with this ID already exists');
		}
		throw e;
	}
};
