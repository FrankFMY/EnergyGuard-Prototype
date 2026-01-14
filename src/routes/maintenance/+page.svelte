<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { _ } from 'svelte-i18n';
	import { currency as currencyState } from '$lib/state/currency.svelte.js';
	import { Card, Badge, ProgressBar } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import Wrench from 'lucide-svelte/icons/wrench';
	import Clock from 'lucide-svelte/icons/clock';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Package from 'lucide-svelte/icons/package';
	import Calendar from 'lucide-svelte/icons/calendar';
	import Gauge from 'lucide-svelte/icons/gauge';
	import {
		calculateForecast,
		getSpareParts,
		type MaintenanceForecast,
		type SparePart
	} from '$lib/services/maintenance.service.js';

	interface Engine {
		id: string;
		model: string;
		status: string;
		total_hours: number;
	}

	let forecasts: MaintenanceForecast[] = $state([]);
	let spareParts: SparePart[] = $state([]);
	let loading = $state(true);
	const SERVICE_INTERVAL = 2000;

	onMount(async () => {
		try {
			const [res, parts] = await Promise.all([fetch(`${base}/api/status`), getSpareParts()]);

			spareParts = parts;

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

	function getUrgencyBadge(urgency: MaintenanceForecast['urgency']) {
		const variants: Record<MaintenanceForecast['urgency'], 'success' | 'warning' | 'danger'> = {
			low: 'success',
			medium: 'warning',
			high: 'warning',
			critical: 'danger'
		};
		return variants[urgency];
	}

	function getUrgencyColor(urgency: MaintenanceForecast['urgency']) {
		switch (urgency) {
			case 'critical':
				return 'border-rose-500/30 bg-rose-500/5';
			case 'high':
				return 'border-amber-500/30 bg-amber-500/5';
			default:
				return 'border-white/5';
		}
	}

	const totalBudget = $derived(
		forecasts.filter((f) => f.days_remaining <= 30).reduce((sum, f) => sum + f.estimated_cost, 0)
	);
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
				<Wrench class="h-6 w-6 text-cyan-400 sm:h-7 sm:w-7" />
				{$_('maintenance.title')}
			</h1>
			<p class="mt-1 text-sm text-slate-400">
				{$_('maintenance.budgetForecast')}: {currencyState.format(totalBudget)}
			</p>
		</div>
	</div>

	{#if loading}
		<!-- Loading Skeleton -->
		<div class="space-y-4">
			{#each { length: 4 } as _item, i (i)}
				<Card>
					<div class="flex items-center gap-4">
						<div class="h-12 w-12 animate-pulse rounded-lg bg-slate-700"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-24 animate-pulse rounded bg-slate-700"></div>
							<div class="h-3 w-32 animate-pulse rounded bg-slate-700"></div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{:else}
		<!-- Mobile Card View (visible on small screens) -->
		<div class="space-y-4 md:hidden">
			{#each forecasts as forecast (forecast.engine_id)}
				<Card class={cn('overflow-hidden', getUrgencyColor(forecast.urgency))}>
					<!-- Card Header -->
					<div class="mb-4 flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div
								class={cn(
									'flex h-11 w-11 items-center justify-center rounded-xl',
									forecast.urgency === 'critical'
										? 'bg-rose-500/20 text-rose-400'
										: forecast.urgency === 'high'
											? 'bg-amber-500/20 text-amber-400'
											: 'bg-slate-800 text-slate-400'
								)}
							>
								<Wrench class="h-5 w-5" />
							</div>
							<div>
								<div class="text-base font-bold text-white">{forecast.engine_id.toUpperCase()}</div>
								<div class="text-xs text-slate-500">{forecast.model}</div>
							</div>
						</div>
						{#if forecast.parts_available}
							<Badge variant="success" class="shrink-0">
								<CheckCircle class="h-3 w-3" />
								<span class="hidden xs:inline">{$_('maintenance.partsAvailable')}</span>
							</Badge>
						{:else}
							<Badge variant="danger" class="shrink-0">
								<AlertTriangle class="h-3 w-3" />
								<span class="hidden xs:inline">{$_('maintenance.partsUnavailable')}</span>
							</Badge>
						{/if}
					</div>

					<!-- Time Remaining with Progress -->
					<div class="mb-4">
						<div class="mb-2 flex items-center justify-between">
							<Badge variant={getUrgencyBadge(forecast.urgency)}>
								<Clock class="h-3 w-3" />
								{forecast.hours_remaining}h ({forecast.days_remaining}d)
							</Badge>
							<span class="text-xs text-slate-500">
								{$_('maintenance.nextService')}: {forecast.next_service_date}
							</span>
						</div>
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

					<!-- Stats Grid -->
					<div class="grid grid-cols-2 gap-3">
						<div class="rounded-lg bg-white/5 p-3">
							<div class="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
								<Gauge class="h-3 w-3" />
								{$_('maintenance.totalHours')}
							</div>
							<div class="font-mono text-sm font-medium text-white">
								{forecast.total_hours.toLocaleString()}h
							</div>
						</div>
						<div class="rounded-lg bg-white/5 p-3">
							<div class="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
								<Calendar class="h-3 w-3" />
								{$_('maintenance.estimatedCost')}
							</div>
							<div class="font-mono text-sm font-medium text-white">
								{currencyState.format(forecast.estimated_cost)}
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>

		<!-- Desktop Table View (visible on medium screens and up) -->
		<Card class="hidden overflow-hidden p-0 md:block">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-white/5 bg-slate-800/50">
						<tr>
							<th class="p-4 font-semibold text-slate-300">{$_('maintenance.engine')}</th>
							<th class="p-4 font-semibold text-slate-300">{$_('maintenance.model')}</th>
							<th class="p-4 font-semibold text-slate-300">{$_('maintenance.totalHours')}</th>
							<th class="p-4 font-semibold text-slate-300">{$_('maintenance.nextService')}</th>
							<th class="p-4 font-semibold text-slate-300">{$_('maintenance.timeRemaining')}</th>
							<th class="p-4 font-semibold text-slate-300">{$_('maintenance.estimatedCost')}</th>
							<th class="p-4 font-semibold text-slate-300">{$_('maintenance.parts')}</th>
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
										>{currencyState.convert(forecast.estimated_cost).toLocaleString()}</span
									>
									<span class="ml-1 text-slate-500">{currencyState.info.symbol}</span>
								</td>
								<td class="p-4">
									{#if forecast.parts_available}
										<Badge variant="success">
											<CheckCircle class="h-3 w-3" />
											{$_('maintenance.partsAvailable')}
										</Badge>
									{:else}
										<Badge variant="danger">
											<AlertTriangle class="h-3 w-3" />
											{$_('maintenance.partsUnavailable')}
										</Badge>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>

		<!-- Spare Parts Inventory & Budget -->
		<div class="grid gap-6 lg:grid-cols-2">
			<Card>
				<h3 class="mb-4 flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
					<Package class="h-5 w-5 text-cyan-400" />
					{$_('maintenance.sparePartsInventory')}
				</h3>
				<div class="space-y-2 sm:space-y-3">
					{#each spareParts as part (part.name)}
						<div
							class="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2.5 sm:px-4 sm:py-3"
						>
							<span class="text-sm text-slate-300">{part.name}</span>
							<div class="flex items-center gap-2">
								<span
									class={cn(
										'font-mono text-sm',
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
				<h3 class="mb-4 text-base font-semibold text-white sm:text-lg">
					{$_('maintenance.budgetForecast')}
				</h3>
				<div class="space-y-3 sm:space-y-4">
					<div class="rounded-lg bg-slate-800/50 p-3 sm:p-4">
						<div class="text-xs text-slate-400 sm:text-sm">{$_('maintenance.next7days')}</div>
						<div class="mt-1 text-xl font-bold text-rose-400 sm:text-2xl">
							{currencyState.format(
								forecasts
									.filter((f) => f.days_remaining <= 7)
									.reduce((sum, f) => sum + f.estimated_cost, 0)
							)}
						</div>
					</div>
					<div class="rounded-lg bg-slate-800/50 p-3 sm:p-4">
						<div class="text-xs text-slate-400 sm:text-sm">{$_('maintenance.next30days')}</div>
						<div class="mt-1 text-xl font-bold text-amber-400 sm:text-2xl">
							{currencyState.format(
								forecasts
									.filter((f) => f.days_remaining <= 30)
									.reduce((sum, f) => sum + f.estimated_cost, 0)
							)}
						</div>
					</div>
					<div class="rounded-lg bg-slate-800/50 p-3 sm:p-4">
						<div class="text-xs text-slate-400 sm:text-sm">{$_('maintenance.nextQuarter')}</div>
						<div class="mt-1 text-xl font-bold text-emerald-400 sm:text-2xl">
							{currencyState.format(forecasts.reduce((sum, f) => sum + f.estimated_cost, 0))}
						</div>
					</div>
				</div>
			</Card>
		</div>
	{/if}
</div>
