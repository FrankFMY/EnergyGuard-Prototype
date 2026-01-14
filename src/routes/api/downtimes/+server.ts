import { json } from '@sveltejs/kit';
import { getRecentDowntimes } from '$lib/server/services/engine.service.js';

export async function GET() {
	try {
		const downtimes = await getRecentDowntimes();
		return json(downtimes);
	} catch (e) {
		console.error('[API] Failed to fetch downtimes:', e);
		return json({ error: 'Failed to fetch downtimes' }, { status: 500 });
	}
}
