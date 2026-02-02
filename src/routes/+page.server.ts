import type { PageServerLoad } from './$types.js';
import { getDashboardData } from '$lib/server/services/engine.service.js';
import type { DashboardData, EngineWithMetrics, EventDisplay } from '$lib/types/index.js';

// Fallback данные для презентации - если БД недоступна или медленная
const FALLBACK_DATA: DashboardData = {
	engines: [
		{ id: 'gpu-1', model: 'Jenbacher J620', status: 'ok', total_hours: 12450, planned_power_kw: 1200, power_kw: 1180, temp: 485, gas_consumption: 280, vibration: 4.2, gas_pressure: 2.8, profit_rate: 2840, efficiency: 87 },
		{ id: 'gpu-2', model: 'Jenbacher J620', status: 'ok', total_hours: 11200, planned_power_kw: 1200, power_kw: 1150, temp: 478, gas_consumption: 275, vibration: 3.8, gas_pressure: 2.7, profit_rate: 2720, efficiency: 85 },
		{ id: 'gpu-3', model: 'Caterpillar G3520', status: 'warning', total_hours: 15800, planned_power_kw: 1200, power_kw: 1050, temp: 512, gas_consumption: 295, vibration: 6.5, gas_pressure: 2.5, profit_rate: 2180, efficiency: 78 },
		{ id: 'gpu-4', model: 'Caterpillar G3520', status: 'ok', total_hours: 9600, planned_power_kw: 1200, power_kw: 1220, temp: 468, gas_consumption: 270, vibration: 3.5, gas_pressure: 2.9, profit_rate: 3050, efficiency: 91 },
		{ id: 'gpu-5', model: 'MWM TCG 2020', status: 'ok', total_hours: 8400, planned_power_kw: 1200, power_kw: 1190, temp: 475, gas_consumption: 268, vibration: 4.0, gas_pressure: 2.8, profit_rate: 2920, efficiency: 89 },
		{ id: 'gpu-6', model: 'MWM TCG 2020', status: 'error', total_hours: 18200, planned_power_kw: 1200, power_kw: 0, temp: 45, gas_consumption: 0, vibration: 0.1, gas_pressure: 0, profit_rate: 0, efficiency: 0 }
	] as EngineWithMetrics[],
	events: [
		{ id: '1', time: new Date().toISOString(), level: 'info', message: 'Система запущена в демо-режиме', engine_id: null },
		{ id: '2', time: new Date(Date.now() - 60000).toISOString(), level: 'warning', message: 'GPU-3: Повышенная температура выхлопа', engine_id: 'gpu-3' },
		{ id: '3', time: new Date(Date.now() - 120000).toISOString(), level: 'error', message: 'GPU-6: Двигатель остановлен для ТО', engine_id: 'gpu-6' }
	] as EventDisplay[],
	summary: {
		totalPowerMW: 5.79,
		totalPlannedMW: 7.2,
		efficiency: 80.4,
		currentLoss: 12500,
		enginesOnline: 5,
		enginesTotal: 6,
		enginesWarning: 1,
		enginesError: 1
	},
	timestamp: new Date().toISOString()
};

/**
 * Dashboard SSR load with timeout and fallback
 * Ensures page always loads, even if DB is slow/unavailable
 */
export const load: PageServerLoad = async () => {
	try {
		// Race between data fetch and timeout
		const data = await Promise.race([
			getDashboardData(),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('SSR timeout')), 8000)
			)
		]);
		return data;
	} catch (error) {
		console.error('[Dashboard SSR] Failed to load data, using fallback:', error);
		return FALLBACK_DATA;
	}
};
