import { json } from '@sveltejs/kit';
import { getTelemetryHistory } from '$lib/server/services/telemetry.service.js';

export async function GET({ params, url }) {
	const { id } = params;
	const range = url.searchParams.get('range') || '5m';

	let minutes = 5;
	let limit = 300;

	switch (range) {
		case '1h':
			minutes = 60;
			limit = 600;
			break;
		case '24h':
			minutes = 24 * 60;
			limit = 1000;
			break;
		case '7d':
			minutes = 7 * 24 * 60;
			limit = 2000;
			break;
		default: // 5m
			minutes = 5;
			limit = 300;
	}

	const history = await getTelemetryHistory(id, minutes, limit);
	return json(history);
}
