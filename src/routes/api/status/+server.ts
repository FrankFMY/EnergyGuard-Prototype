import { json } from '@sveltejs/kit';
import { getDashboardData } from '$lib/server/services/engine.service.js';
import { getLatestEvents } from '$lib/server/services/event.service.js';

export async function GET() {
	const { engines, summary } = await getDashboardData();
	const events = await getLatestEvents(10);

	return json({
		engines,
		summary,
		events
	});
}
