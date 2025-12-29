import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { engines } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { createAuditLog } from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ params }) => {
	const [engine] = await db.select().from(engines).where(eq(engines.id, params.id)).limit(1);

	if (!engine) {
		throw error(404, 'Engine not found');
	}

	return json(engine);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!['admin', 'operator'].includes(locals.user.role ?? '')) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await request.json();

	const updateData: Partial<{ model: string; status: 'ok' | 'warning' | 'error'; total_hours: number }> = {};

	if (body.model) updateData.model = body.model;
	if (body.status && ['ok', 'warning', 'error'].includes(body.status)) {
		updateData.status = body.status;
	}
	if (typeof body.total_hours === 'number') {
		updateData.total_hours = body.total_hours;
	}

	if (Object.keys(updateData).length === 0) {
		throw error(400, 'No valid fields to update');
	}

	const [engine] = await db
		.update(engines)
		.set(updateData)
		.where(eq(engines.id, params.id))
		.returning();

	if (!engine) {
		throw error(404, 'Engine not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'update',
		resource: 'engine',
		resourceId: params.id,
		details: updateData
	});

	return json(engine);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (locals.user.role !== 'admin') {
		throw error(403, 'Only admins can delete engines');
	}

	const result = await db.delete(engines).where(eq(engines.id, params.id)).returning({ id: engines.id });

	if (result.length === 0) {
		throw error(404, 'Engine not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'delete',
		resource: 'engine',
		resourceId: params.id
	});

	return json({ success: true });
};
