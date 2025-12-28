import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { telemetry } from '$lib/server/db/schema.js';
import { eq, desc, and, gte } from 'drizzle-orm';

export async function GET({ params }) {
	const { id } = params;

	// Last 5 minutes of data
	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

	const history = await db
		.select({
			time: telemetry.time,
			power: telemetry.power_kw,
			temp: telemetry.temp_exhaust
		})
		.from(telemetry)
		.where(and(eq(telemetry.engine_id, id), gte(telemetry.time, fiveMinutesAgo)))
		.orderBy(desc(telemetry.time))
		.limit(300); // safety limit

	// Return in chronological order for charts
	return json(history.reverse());
}
