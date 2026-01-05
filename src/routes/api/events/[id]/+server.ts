import { json } from '@sveltejs/kit';
import { getEventsForEngine } from '$lib/server/services/event.service.js';

export async function GET({ params, url }) {
	const { id } = params;
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);

	const events = await getEventsForEngine(id, limit);
	return json(events);
}
