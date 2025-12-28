import type { MaintenanceForecast, Engine } from '$lib/types/index.js';
import { SERVICE_TYPES, ENGINE_CONSTANTS } from '$lib/types/index.js';
import { getAllEngines } from './engine.service.js';

/**
 * Calculate maintenance forecast for an engine
 */
export function calculateMaintenanceForecast(engine: Engine): MaintenanceForecast {
	const serviceInterval = ENGINE_CONSTANTS.SERVICE_INTERVAL_HOURS;
	const hoursRemaining = serviceInterval - (engine.total_hours % serviceInterval);
	const daysRemaining = Math.floor(hoursRemaining / 24);

	// Determine next service date
	const nextServiceDate = new Date();
	nextServiceDate.setHours(nextServiceDate.getHours() + hoursRemaining);

	// Determine urgency based on time remaining
	let urgency: MaintenanceForecast['urgency'];
	if (daysRemaining < 3) {
		urgency = 'critical';
	} else if (daysRemaining < 7) {
		urgency = 'high';
	} else if (daysRemaining < 30) {
		urgency = 'medium';
	} else {
		urgency = 'low';
	}

	// Estimate cost based on service type
	const serviceType = getNextServiceType(engine.total_hours);
	const estimatedCost = SERVICE_TYPES[serviceType].baseCost;

	// Mock parts availability (in real app, would check inventory)
	const partsAvailable = Math.random() > 0.2; // 80% chance parts are available

	return {
		engine_id: engine.id,
		model: engine.model,
		total_hours: engine.total_hours,
		next_service_date: nextServiceDate.toISOString().split('T')[0],
		hours_remaining: hoursRemaining,
		days_remaining: daysRemaining,
		estimated_cost: estimatedCost,
		parts_available: partsAvailable,
		urgency
	};
}

/**
 * Determine the next service type based on total hours
 */
export function getNextServiceType(totalHours: number): keyof typeof SERVICE_TYPES {
	const hoursInCycle = totalHours % SERVICE_TYPES.overhaul.interval;

	if (hoursInCycle >= SERVICE_TYPES.overhaul.interval - 100) {
		return 'overhaul';
	} else if (hoursInCycle % SERVICE_TYPES.major.interval >= SERVICE_TYPES.major.interval - 100) {
		return 'major';
	} else {
		return 'minor';
	}
}

/**
 * Get maintenance forecasts for all engines
 */
export async function getAllMaintenanceForecasts(): Promise<MaintenanceForecast[]> {
	const engines = await getAllEngines();

	return engines
		.map((engine: Engine) => calculateMaintenanceForecast(engine))
		.sort(
			(a: MaintenanceForecast, b: MaintenanceForecast) => a.hours_remaining - b.hours_remaining
		);
}

/**
 * Get engines that need immediate attention (within 7 days)
 */
export async function getUrgentMaintenance(): Promise<MaintenanceForecast[]> {
	const forecasts = await getAllMaintenanceForecasts();
	return forecasts.filter((f) => f.urgency === 'critical' || f.urgency === 'high');
}

/**
 * Calculate total maintenance budget for next month
 */
export async function getMonthlyMaintenanceBudget(): Promise<number> {
	const forecasts = await getAllMaintenanceForecasts();
	const thirtyDaysFromNow = 30 * 24; // hours

	return forecasts
		.filter((f) => f.hours_remaining <= thirtyDaysFromNow)
		.reduce((sum, f) => sum + f.estimated_cost, 0);
}

/**
 * Mock spare parts inventory
 */
export function getMockSparePartsInventory() {
	return [
		{ id: 'sp-001', name: 'Масляный фильтр', quantity: 12, min_quantity: 5, unit_cost: 3500 },
		{ id: 'sp-002', name: 'Воздушный фильтр', quantity: 8, min_quantity: 4, unit_cost: 5200 },
		{ id: 'sp-003', name: 'Свеча зажигания', quantity: 24, min_quantity: 20, unit_cost: 2800 },
		{ id: 'sp-004', name: 'Ремень ГРМ', quantity: 2, min_quantity: 2, unit_cost: 15000 },
		{ id: 'sp-005', name: 'Прокладка ГБЦ', quantity: 1, min_quantity: 2, unit_cost: 45000 },
		{ id: 'sp-006', name: 'Масло моторное (л)', quantity: 150, min_quantity: 100, unit_cost: 850 },
		{ id: 'sp-007', name: 'Антифриз (л)', quantity: 40, min_quantity: 30, unit_cost: 450 }
	];
}
