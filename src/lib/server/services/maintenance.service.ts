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
 * Get spare parts from database
 */
export async function getSparePartsInventory() {
	const { db } = await import('../db/index.js');
	const { spareParts } = await import('../db/schema.js');

	return db.select().from(spareParts).orderBy(spareParts.name);
}

/**
 * Check if parts are available for maintenance
 */
export async function checkPartsAvailability(_engineId: string): Promise<boolean> {
	const { db } = await import('../db/index.js');
	const { spareParts } = await import('../db/schema.js');
	const { lt } = await import('drizzle-orm');

	// Check if any parts are below minimum
	const lowParts = await db
		.select()
		.from(spareParts)
		.where(lt(spareParts.quantity, spareParts.min_quantity))
		.limit(1);

	return lowParts.length === 0;
}

/**
 * Update spare part quantity
 */
export async function updateSparePartQuantity(partId: string, quantity: number) {
	const { db } = await import('../db/index.js');
	const { spareParts } = await import('../db/schema.js');
	const { eq } = await import('drizzle-orm');

	const [part] = await db
		.update(spareParts)
		.set({ quantity })
		.where(eq(spareParts.id, partId))
		.returning();

	return part ?? null;
}

/**
 * Get maintenance schedules from database
 */
export async function getMaintenanceSchedules(engineId?: string) {
	const { db } = await import('../db/index.js');
	const { maintenanceSchedules } = await import('../db/schema.js');
	const { eq, desc } = await import('drizzle-orm');

	let query = db.select().from(maintenanceSchedules).orderBy(desc(maintenanceSchedules.due_date));

	if (engineId) {
		query = query.where(eq(maintenanceSchedules.engine_id, engineId)) as typeof query;
	}

	return query.limit(50);
}

/**
 * Complete a maintenance schedule
 */
export async function completeMaintenanceSchedule(scheduleId: string) {
	const { db } = await import('../db/index.js');
	const { maintenanceSchedules } = await import('../db/schema.js');
	const { eq } = await import('drizzle-orm');

	const [schedule] = await db
		.update(maintenanceSchedules)
		.set({
			completed: true,
			completed_at: new Date()
		})
		.where(eq(maintenanceSchedules.id, scheduleId))
		.returning();

	return schedule ?? null;
}

/**
 * Seed default spare parts if empty
 */
export async function seedSpareParts() {
	const { db } = await import('../db/index.js');
	const { spareParts } = await import('../db/schema.js');

	const existing = await db.select().from(spareParts).limit(1);
	if (existing.length > 0) return;

	const defaultParts = [
		{ name: 'Масляный фильтр', part_number: 'JEN-OF-420', quantity: 12, min_quantity: 5, unit_cost: 3500 },
		{ name: 'Воздушный фильтр', part_number: 'JEN-AF-420', quantity: 8, min_quantity: 4, unit_cost: 5200 },
		{ name: 'Свеча зажигания', part_number: 'JEN-SP-420', quantity: 24, min_quantity: 20, unit_cost: 2800 },
		{ name: 'Ремень ГРМ', part_number: 'JEN-TB-420', quantity: 2, min_quantity: 2, unit_cost: 15000 },
		{ name: 'Прокладка ГБЦ', part_number: 'JEN-HG-420', quantity: 1, min_quantity: 2, unit_cost: 45000 },
		{ name: 'Масло моторное (л)', part_number: 'OIL-10W40', quantity: 150, min_quantity: 100, unit_cost: 850 },
		{ name: 'Антифриз (л)', part_number: 'COOL-G12', quantity: 40, min_quantity: 30, unit_cost: 450 }
	];

	await db.insert(spareParts).values(defaultParts);
}
