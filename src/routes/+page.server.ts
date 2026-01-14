import type { PageServerLoad } from './$types.js';
import { getDashboardData } from '$lib/server/services/engine.service.js';

export const load: PageServerLoad = async () => {
	const data = await getDashboardData();
	return data;
};
