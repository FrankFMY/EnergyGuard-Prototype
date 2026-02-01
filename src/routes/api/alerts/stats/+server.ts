import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAlertStats } from '$lib/server/services/alert.service.js';

export const GET: RequestHandler = async () => {
	try {
		const stats = await getAlertStats();
		return json(stats);
	} catch (error) {
		console.error('Alert stats API error:', error);
		return json(
			{ error: 'Failed to fetch alert statistics', total: 0, critical: 0, warning: 0, info: 0 },
			{ status: 500 }
		);
	}
};
