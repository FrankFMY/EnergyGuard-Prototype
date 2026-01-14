import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getUserById,
	updateUserRole,
	updateUserProfile,
	deleteUser,
	getAuditLogsByUser,
	createAuditLog,
	type UserRole
} from '$lib/server/services/user.service.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Users can view their own profile, admins can view any profile
	if (locals.user.id !== params.id && locals.user.role !== 'admin') {
		throw error(403, 'Access denied');
	}

	const user = await getUserById(params.id);
	if (!user) {
		throw error(404, 'User not found');
	}

	const auditLogs = locals.user.role === 'admin' ? await getAuditLogsByUser(params.id, 20) : [];

	return json({ user, auditLogs });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();

	// Role update - admin only
	if (body.role) {
		if (locals.user.role !== 'admin') {
			throw error(403, 'Only admins can change roles');
		}

		const validRoles: UserRole[] = ['admin', 'operator', 'technician', 'viewer'];
		if (!validRoles.includes(body.role)) {
			throw error(400, 'Invalid role');
		}

		// Prevent self-demotion from admin
		if (params.id === locals.user.id && body.role !== 'admin') {
			throw error(400, 'Cannot demote yourself');
		}

		const user = await updateUserRole(params.id, body.role);
		if (!user) {
			throw error(404, 'User not found');
		}

		await createAuditLog({
			userId: locals.user.id,
			action: 'update_role',
			resource: 'user',
			resourceId: params.id,
			details: { newRole: body.role }
		});

		return json(user);
	}

	// Profile update - self or admin
	if (locals.user.id !== params.id && locals.user.role !== 'admin') {
		throw error(403, 'Access denied');
	}

	const user = await updateUserProfile(params.id, {
		name: body.name,
		image: body.image
	});

	if (!user) {
		throw error(404, 'User not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'update_profile',
		resource: 'user',
		resourceId: params.id,
		details: { name: body.name }
	});

	return json(user);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (locals.user.role !== 'admin') {
		throw error(403, 'Only admins can delete users');
	}

	// Prevent self-deletion
	if (params.id === locals.user.id) {
		throw error(400, 'Cannot delete yourself');
	}

	const success = await deleteUser(params.id);
	if (!success) {
		throw error(404, 'User not found');
	}

	await createAuditLog({
		userId: locals.user.id,
		action: 'delete',
		resource: 'user',
		resourceId: params.id
	});

	return json({ success: true });
};
