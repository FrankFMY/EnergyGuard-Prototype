import { json } from '@sveltejs/kit';
import { getTelemetryHistory } from '$lib/server/services/telemetry.service.js';

export async function GET({ params }) {
	const { id } = params;
	const history = await getTelemetryHistory(id, 5, 300);
	return json(history);
}
