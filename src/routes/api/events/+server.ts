import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { events } from '$lib/server/db/schema.js';

export async function POST({ request }) {
	// For demo purposes, we allow unauthorized posts if it's from the simulator
	const body = await request.json();
	
	if (!body.message || !body.level) {
		throw error(400, 'Missing message or level');
	}

	const [newEvent] = await db.insert(events).values({
		message: body.message,
		level: body.level,
		engine_id: body.engine_id || null,
		time: new Date()
	}).returning();

	return json(newEvent);
}
