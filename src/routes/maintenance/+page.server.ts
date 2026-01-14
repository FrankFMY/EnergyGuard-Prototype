import type { PageServerLoad } from './$types.js';
import {
	getAllMaintenanceForecasts,
	getSparePartsInventory,
	seedSpareParts
} from '$lib/server/services/maintenance.service.js';
import { getAllEngines } from '$lib/server/services/engine.service.js';
import type { MaintenanceForecast } from '$lib/types/index.js';

export const load: PageServerLoad = async () => {
	// Seed spare parts if empty
	await seedSpareParts();

	const [maintenanceRecords, spareParts, engines] = await Promise.all([
		getAllMaintenanceForecasts(),
		getSparePartsInventory(),
		getAllEngines()
	]);

	// Calculate budget from upcoming maintenance
	const budgetNext7Days = maintenanceRecords
		.filter((m: MaintenanceForecast) => m.days_remaining <= 7)
		.reduce((sum: number, m: MaintenanceForecast) => sum + m.estimated_cost, 0);

	const budgetNext30Days = maintenanceRecords
		.filter((m: MaintenanceForecast) => m.days_remaining <= 30)
		.reduce((sum: number, m: MaintenanceForecast) => sum + m.estimated_cost, 0);

	const budgetNextQuarter = maintenanceRecords
		.filter((m: MaintenanceForecast) => m.days_remaining <= 90)
		.reduce((sum: number, m: MaintenanceForecast) => sum + m.estimated_cost, 0);

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
