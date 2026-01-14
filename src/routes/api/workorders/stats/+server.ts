import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getWorkOrderStats } from '$lib/server/services/workorder.service.js';

export const GET: RequestHandler = async () => {
	const stats = await getWorkOrderStats();
	return json(stats);
};
