import { ENGINE_CONSTANTS } from '$lib/types/index.js';

/**
 * Calculate power derating based on gas quality
 * @param gasQuality Gas quality index (0.7 to 1.0)
 * @param nominalPower Nominal power in kW
 * @returns Derated power in kW
 */
export function calculatePowerDerating(gasQuality: number, nominalPower: number): number {
	// Simple engineering model for demo:
	// If gasQuality = 1.0 -> 100% power
	// If gasQuality = 0.7 -> 70% power
	// Using a linear model with a slight polynomial curve for realism at lower quality
	const factor = 0.7 + (gasQuality - 0.7) * 1.0;
	const deratingFactor = Math.pow(factor, 1.1); // Slight curve
	return nominalPower * deratingFactor;
}

/**
 * Calculate exhaust temperature based on gas quality
 * @param gasQuality Gas quality index (0.7 to 1.0)
 * @param baseTemp Base temperature in °C (default 450)
 * @returns Exhaust temperature in °C
 */
export function calculateTemperatureFromGasQuality(
	gasQuality: number,
	baseTemp: number = 450
): number {
	// Dirty gas (0.7) -> temperature increases
	// Max increase around 80°C
	const tempIncrease = (1.0 - gasQuality) * 80 * 3; // 0.3 * 80 * 3 = 72°C
	return baseTemp + Math.min(tempIncrease, 90);
}

/**
 * Calculate financial loss per hour based on power loss
 * @param powerLoss Power loss in kW
 * @param tariff Tariff in RUB/kWh
 * @returns Loss in RUB per hour
 */
export function calculateLostRevenue(
	powerLoss: number,
	tariff: number = ENGINE_CONSTANTS.TARIFF_RUB_PER_KWH
): number {
	return powerLoss * tariff;
}

/**
 * Calculate engine efficiency based on gas quality
 * @param gasQuality Gas quality index (0.7 to 1.0)
 * @returns Efficiency percentage (0-100)
 */
export function calculateGasEfficiency(gasQuality: number): number {
	// 1.0 -> 42% (typical for gas engine)
	// 0.7 -> 32%
	return 42 * (0.7 + (gasQuality - 0.7) * 1.0);
}
