import type { PageServerLoad } from './$types';
import {
	getAllMaintenanceForecasts,
	getMockSparePartsInventory
} from '$lib/server/services/maintenance.service.js';
import { getAllEngines } from '$lib/server/services/engine.service.js';

export const load: PageServerLoad = async () => {
	const [maintenanceRecords, spareParts, engines] = await Promise.all([
		getAllMaintenanceForecasts(),
		Promise.resolve(getMockSparePartsInventory()),
		getAllEngines()
	]);

	// Calculate budget from upcoming maintenance
	const budgetNext7Days = maintenanceRecords
		.filter((m) => m.days_remaining <= 7)
		.reduce((sum, m) => sum + m.estimated_cost, 0);

	const budgetNext30Days = maintenanceRecords
		.filter((m) => m.days_remaining <= 30)
		.reduce((sum, m) => sum + m.estimated_cost, 0);

	const budgetNextQuarter = maintenanceRecords
		.filter((m) => m.days_remaining <= 90)
		.reduce((sum, m) => sum + m.estimated_cost, 0);

	return {
		maintenanceRecords,
		spareParts,
		engines,
		budget: {
			next7Days: budgetNext7Days,
			next30Days: budgetNext30Days,
			nextQuarter: budgetNextQuarter
		}
	};
};
