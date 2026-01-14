export interface CostBreakdown {
	gas: number;
	depreciation: number;
	spare_parts: number;
	labor: number;
	other: number;
	total: number;
	cost_per_kwh: number;
}

export interface MonthlyTrend {
	month: string;
	cost: number;
	production: number;
}

export const getCostBreakdown = async (): Promise<CostBreakdown> => {
	// Simulate API delay
	await new Promise((r) => setTimeout(r, 500));
	return {
		gas: 2.85,
		depreciation: 0.95,
		spare_parts: 0.48,
		labor: 0.48,
		other: 0.24,
		total: 5.0,
		cost_per_kwh: 5.0
	};
};

export const getMonthlyTrend = async (): Promise<MonthlyTrend[]> => {
	// Simulate API delay
	await new Promise((r) => setTimeout(r, 500));
	return [
		{ month: 'Июл', cost: 4.8, production: 2100 },
		{ month: 'Авг', cost: 4.9, production: 2200 },
		{ month: 'Сен', cost: 5.1, production: 2150 },
		{ month: 'Окт', cost: 4.95, production: 2180 },
		{ month: 'Ноя', cost: 5.0, production: 2250 },
		{ month: 'Дек', cost: 5.2, production: 2300 }
	];
};
