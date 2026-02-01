import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getWorkOrderStats } from '$lib/server/services/workorder.service.js';

export const GET: RequestHandler = async () => {
	try {
		const stats = await getWorkOrderStats();
		return json(stats);
	} catch (error) {
		console.error('Work order stats API error:', error);
		return json(
			{ error: 'Failed to fetch work order statistics', total: 0, open: 0, inProgress: 0, completed: 0 },
			{ status: 500 }
		);
	}
};
