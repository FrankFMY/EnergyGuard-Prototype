<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { _, isLoading } from 'svelte-i18n';
	import { Card, Badge, ProgressBar } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import Wrench from 'lucide-svelte/icons/wrench';
	import Clock from 'lucide-svelte/icons/clock';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Package from 'lucide-svelte/icons/package';

	interface Engine {
		id: string;
		model: string;
		status: string;
		total_hours: number;
	}

	interface MaintenanceForecast {
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

	let forecasts: MaintenanceForecast[] = $state([]);
	let loading = $state(true);
	const SERVICE_INTERVAL = 2000;

	onMount(async () => {
		try {
			const res = await fetch(`${base}/api/status`);
			if (res.ok) {
				const data = await res.json();
				forecasts = data.engines.map((engine: Engine) => calculateForecast(engine));
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function calculateForecast(engine: Engine): MaintenanceForecast {
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
			parts_available: Math.random() > 0.2,
			urgency
		};
	}

	function getUrgencyBadge(urgency: MaintenanceForecast['urgency']) {
		const variants = {
			low: 'success',
			medium: 'warning',
			high: 'warning',
			critical: 'danger'
		} as const;
		return variants[urgency];
	}

	const totalBudget = $derived(
		forecasts.filter((f) => f.days_remaining <= 30).reduce((sum, f) => sum + f.estimated_cost, 0)
	);
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<Wrench class="h-7 w-7 text-cyan-400" />
				{#if !$isLoading}
					{$_('maintenance.title')}
				{:else}
					Maintenance Forecast
				{/if}
			</h1>
			<p class="mt-1 text-sm text-slate-400">
				{#if !$isLoading}
					{$_('maintenance.budgetForecast')}: {totalBudget.toLocaleString()} ₽
				{:else}
					Monthly Budget: {totalBudget.toLocaleString()} ₽
				{/if}
			</p>
		</div>
	</div>

	{#if loading}
		<!-- Loading Skeleton -->
		<Card>
			<div class="space-y-4">
				{#each Array(4) as _, i}
					<div class="flex items-center gap-4 rounded-lg bg-slate-800/50 p-4">
						<div class="h-12 w-12 animate-pulse rounded-lg bg-slate-700"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-24 animate-pulse rounded bg-slate-700"></div>
							<div class="h-3 w-32 animate-pulse rounded bg-slate-700"></div>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{:else}
		<!-- Maintenance Table -->
		<Card class="overflow-hidden p-0">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-white/5 bg-slate-800/50">
						<tr>
							<th class="p-4 font-semibold text-slate-300">
								{#if !$isLoading}Engine{:else}Engine{/if}
							</th>
							<th class="p-4 font-semibold text-slate-300">Model</th>
							<th class="p-4 font-semibold text-slate-300">
								{#if !$isLoading}{$_('maintenance.totalHours')}{:else}Total Hours{/if}
							</th>
							<th class="p-4 font-semibold text-slate-300">
								{#if !$isLoading}{$_('maintenance.nextService')}{:else}Next Service{/if}
							</th>
							<th class="p-4 font-semibold text-slate-300">
								{#if !$isLoading}{$_('maintenance.timeRemaining')}{:else}Time Remaining{/if}
							</th>
							<th class="p-4 font-semibold text-slate-300">
								{#if !$isLoading}{$_('maintenance.estimatedCost')}{:else}Est. Cost{/if}
							</th>
							<th class="p-4 font-semibold text-slate-300">
								{#if !$isLoading}ЗИП{:else}Parts{/if}
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/5">
						{#each forecasts as forecast (forecast.engine_id)}
							<tr class="transition-colors hover:bg-white/5">
								<td class="p-4">
									<div class="flex items-center gap-3">
										<div
											class={cn(
												'flex h-10 w-10 items-center justify-center rounded-lg',
												forecast.urgency === 'critical'
													? 'bg-rose-500/20 text-rose-400'
													: forecast.urgency === 'high'
														? 'bg-amber-500/20 text-amber-400'
														: 'bg-slate-800 text-slate-400'
											)}
										>
											<Wrench class="h-5 w-5" />
										</div>
										<span class="font-medium text-white">{forecast.engine_id.toUpperCase()}</span>
									</div>
								</td>
								<td class="p-4 text-slate-400">{forecast.model}</td>
								<td class="p-4">
									<span class="font-mono text-white">{forecast.total_hours.toLocaleString()}</span>
									<span class="ml-1 text-slate-500">h</span>
								</td>
								<td class="p-4 text-slate-300">{forecast.next_service_date}</td>
								<td class="p-4">
									<div class="flex items-center gap-3">
										<Badge variant={getUrgencyBadge(forecast.urgency)}>
											<Clock class="h-3 w-3" />
											{forecast.hours_remaining}h ({forecast.days_remaining}d)
										</Badge>
									</div>
									<div class="mt-2 w-32">
										<ProgressBar
											value={SERVICE_INTERVAL - forecast.hours_remaining}
											max={SERVICE_INTERVAL}
											variant={forecast.urgency === 'critical'
												? 'danger'
												: forecast.urgency === 'high'
													? 'warning'
													: 'gradient'}
											size="sm"
										/>
									</div>
								</td>
								<td class="p-4">
									<span class="font-mono text-white"
										>{forecast.estimated_cost.toLocaleString()}</span
									>
									<span class="ml-1 text-slate-500">₽</span>
								</td>
								<td class="p-4">
									{#if forecast.parts_available}
										<Badge variant="success">
											<CheckCircle class="h-3 w-3" />
											{#if !$isLoading}{$_('maintenance.partsAvailable')}{:else}Available{/if}
										</Badge>
									{:else}
										<Badge variant="danger">
											<AlertTriangle class="h-3 w-3" />
											{#if !$isLoading}{$_('maintenance.partsUnavailable')}{:else}Unavailable{/if}
										</Badge>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>

		<!-- Spare Parts Inventory -->
		<div class="grid gap-6 lg:grid-cols-2">
			<Card>
				<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
					<Package class="h-5 w-5 text-cyan-400" />
					{#if !$isLoading}{$_('maintenance.sparePartsInventory')}{:else}Spare Parts Inventory{/if}
				</h3>
				<div class="space-y-3">
					{#each [{ name: 'Масляный фильтр', quantity: 12, min: 5 }, { name: 'Воздушный фильтр', quantity: 8, min: 4 }, { name: 'Свеча зажигания', quantity: 24, min: 20 }, { name: 'Ремень ГРМ', quantity: 2, min: 2 }, { name: 'Прокладка ГБЦ', quantity: 1, min: 2 }] as part}
						<div class="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
							<span class="text-slate-300">{part.name}</span>
							<div class="flex items-center gap-2">
								<span
									class={cn(
										'font-mono',
										part.quantity <= part.min ? 'text-rose-400' : 'text-emerald-400'
									)}
								>
									{part.quantity}
								</span>
								{#if part.quantity <= part.min}
									<AlertTriangle class="h-4 w-4 text-rose-400" />
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Card>

			<!-- Budget Summary -->
			<Card>
				<h3 class="mb-4 text-lg font-semibold text-white">
					{#if !$isLoading}{$_('maintenance.budgetForecast')}{:else}Monthly Budget Forecast{/if}
				</h3>
				<div class="space-y-4">
					<div class="rounded-lg bg-slate-800/50 p-4">
						<div class="text-sm text-slate-400">Ближайшие 7 дней</div>
						<div class="mt-1 text-2xl font-bold text-rose-400">
							{forecasts
								.filter((f) => f.days_remaining <= 7)
								.reduce((sum, f) => sum + f.estimated_cost, 0)
								.toLocaleString()} ₽
						</div>
					</div>
					<div class="rounded-lg bg-slate-800/50 p-4">
						<div class="text-sm text-slate-400">Ближайшие 30 дней</div>
						<div class="mt-1 text-2xl font-bold text-amber-400">
							{forecasts
								.filter((f) => f.days_remaining <= 30)
								.reduce((sum, f) => sum + f.estimated_cost, 0)
								.toLocaleString()} ₽
						</div>
					</div>
					<div class="rounded-lg bg-slate-800/50 p-4">
						<div class="text-sm text-slate-400">Следующий квартал</div>
						<div class="mt-1 text-2xl font-bold text-emerald-400">
							{forecasts.reduce((sum, f) => sum + f.estimated_cost, 0).toLocaleString()} ₽
						</div>
					</div>
				</div>
			</Card>
		</div>
	{/if}
</div>
