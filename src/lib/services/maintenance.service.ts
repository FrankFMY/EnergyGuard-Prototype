export interface SparePart {
	name: string;
	quantity: number;
	min: number;
}

export interface MaintenanceForecast {
	engine_id: string;
	model: string;
	total_hours: number;
	next_service_date: string;
	hours_remaining: number;
	days_remaining: number;
	estimated_cost: number;
	parts_available: boolean;
	urgency: 'low' | 'medium' | 'high' | 'critical';
}

export const getSpareParts = async (): Promise<SparePart[]> => {
	// Simulate API delay
	await new Promise((r) => setTimeout(r, 500));
	return [
		{ name: 'Масляный фильтр', quantity: 12, min: 5 },
		{ name: 'Воздушный фильтр', quantity: 8, min: 4 },
		{ name: 'Свеча зажигания', quantity: 24, min: 20 },
		{ name: 'Ремень ГРМ', quantity: 2, min: 2 },
		{ name: 'Прокладка ГБЦ', quantity: 1, min: 2 }
	];
};

// Helper to generate mock forecast data (moved from component)
export const calculateForecast = (engine: {
	id: string;
	model: string;
	total_hours: number;
}): MaintenanceForecast => {
	const SERVICE_INTERVAL = 2000;
	const hoursRemaining = SERVICE_INTERVAL - (engine.total_hours % SERVICE_INTERVAL);
	const daysRemaining = Math.floor(hoursRemaining / 24);
	const nextDate = new Date();
	nextDate.setHours(nextDate.getHours() + hoursRemaining);

	let urgency: MaintenanceForecast['urgency'];
	if (daysRemaining < 3) urgency = 'critical';
	else if (daysRemaining < 7) urgency = 'high';
	else if (daysRemaining < 30) urgency = 'medium';
	else urgency = 'low';

	return {
		engine_id: engine.id,
		model: engine.model,
		total_hours: engine.total_hours,
		next_service_date: nextDate.toLocaleDateString(),
		hours_remaining: hoursRemaining,
		days_remaining: daysRemaining,
		estimated_cost: 250000,
		parts_available: Math.random() > 0.2, // Keep random for demo or fix it? fixing it to true/false based on engine id for consistency could be better but random is fine for now as per original code
		urgency
	};
};
