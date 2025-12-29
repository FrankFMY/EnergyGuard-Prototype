import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAlertStats } from '$lib/server/services/alert.service.js';

export const GET: RequestHandler = async () => {
	const stats = await getAlertStats();
	return json(stats);
};
