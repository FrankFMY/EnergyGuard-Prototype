import { z } from 'zod';

/**
 * Gas quality index schema (0.5 to 1.0)
 * 1.0 = Pure methane (CH4 > 95%)
 * 0.7 = "Heavy" gas with impurities
 */
export const GasQualitySchema = z.number().min(0.5).max(1.0);
export type GasQuality = z.infer<typeof GasQualitySchema>;

/**
 * Result of gas quality calculations
 */
export interface GasQualityCalculationResult {
	gasQuality: number;
	powerDerated: number;
	temperature: number;
	lossPerHour: number;
	efficiency: number;
}
