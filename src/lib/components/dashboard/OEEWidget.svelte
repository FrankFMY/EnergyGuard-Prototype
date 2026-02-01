<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card, Badge } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import Gauge from 'lucide-svelte/icons/gauge';
	import TrendingUp from 'lucide-svelte/icons/trending-up';
	import TrendingDown from 'lucide-svelte/icons/trending-down';
	import Zap from 'lucide-svelte/icons/zap';
	import Fuel from 'lucide-svelte/icons/fuel';

	interface Props {
		class?: string;
		totalPowerMW: number;
		plannedPowerMW: number;
		gasConsumption: number;
	}

	const { class: className = '', totalPowerMW, plannedPowerMW, gasConsumption }: Props = $props();

	// Calculated values using $derived
	const actualKwh = $derived(totalPowerMW * 1000);
	const plannedKwh = $derived(plannedPowerMW * 1000);
	const efficiency = $derived(plannedKwh > 0 ? (actualKwh / plannedKwh) * 100 : 0);

	// Specific consumption (m³/kWh)
	const targetConsumption = 0.25; // Target m³/kWh
	const specificConsumption = $derived(actualKwh > 0 ? gasConsumption / actualKwh : 0);
	const consumptionEfficiency = $derived(
		specificConsumption > 0 ? (targetConsumption / specificConsumption) * 100 : 0
	);
</script>

<Card class={className}>
	<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
		<Gauge class="h-5 w-5 text-cyan-400" />
		{$_('oee.title')}
	</h3>

	<div class="space-y-6">
		<!-- Plan vs Fact - Generation -->
		<div>
			<div class="mb-2 flex items-center justify-between text-sm">
				<div class="flex items-center gap-2 text-slate-400">
					<Zap class="h-4 w-4" />
					{$_('oee.generation')}
				</div>
				<div class="flex items-center gap-2">
					{#if efficiency >= 100}
						<Badge variant="success">
							<TrendingUp class="h-3 w-3" />
							+{(efficiency - 100).toFixed(1)}%
						</Badge>
					{:else}
						<Badge variant="danger">
							<TrendingDown class="h-3 w-3" />
							-{(100 - efficiency).toFixed(1)}%
						</Badge>
					{/if}
				</div>
			</div>

			<div class="flex items-end gap-4">
				<!-- Plan bar -->
				<div class="flex-1">
					<div class="mb-1 text-xs text-slate-500">{$_('oee.planned')}</div>
					<div class="h-8 overflow-hidden rounded bg-slate-800">
						<div class="h-full w-full bg-slate-600"></div>
					</div>
					<div class="mt-1 font-mono text-xs text-slate-400">
						{plannedKwh.toFixed(0)} kW
					</div>
				</div>

				<!-- Actual bar -->
				<div class="flex-1">
					<div class="mb-1 text-xs text-slate-500">{$_('oee.actual')}</div>
					<div class="h-8 overflow-hidden rounded bg-slate-800">
						<div
							class={cn(
								'h-full transition-all duration-1000',
								efficiency >= 90
									? 'bg-emerald-500'
									: efficiency >= 70
										? 'bg-amber-500'
										: 'bg-rose-500'
							)}
							style="width: {Math.min(efficiency, 100)}%"
						></div>
					</div>
					<div class="mt-1 font-mono text-xs text-white">
						{actualKwh.toFixed(0)} kW
					</div>
				</div>
			</div>
		</div>

		<!-- Specific Consumption -->
		<div>
			<div class="mb-2 flex items-center justify-between text-sm">
				<div class="flex items-center gap-2 text-slate-400">
					<Fuel class="h-4 w-4" />
					{$_('oee.specificConsumption')}
				</div>
				<Badge variant={consumptionEfficiency >= 95 ? 'success' : 'warning'}>
					{specificConsumption.toFixed(3)}
					{$_('oee.m3PerKwh')}
				</Badge>
			</div>

			<div class="h-2 overflow-hidden rounded-full bg-slate-800">
				<div
					class={cn(
						'h-full transition-all duration-1000',
						consumptionEfficiency >= 95
							? 'bg-emerald-500'
							: consumptionEfficiency >= 80
								? 'bg-amber-500'
								: 'bg-rose-500'
					)}
					style="width: {Math.min(consumptionEfficiency, 100)}%"
				></div>
			</div>

			<div class="mt-2 flex justify-between text-xs text-slate-500">
				<span>{$_('oee.actual')}: {specificConsumption.toFixed(3)}</span>
				<span>{$_('oee.target')}: {targetConsumption.toFixed(3)}</span>
			</div>
		</div>

		<!-- Summary -->
		<div class="rounded-lg bg-white/5 p-3">
			<div class="grid grid-cols-2 gap-4 text-center">
				<div>
					<div class="text-2xl font-bold text-white">{efficiency.toFixed(1)}%</div>
					<div class="text-xs text-slate-500">{$_('oee.planCompletion')}</div>
				</div>
				<div>
					<div
						class={cn(
							'text-2xl font-bold',
							1 - specificConsumption / targetConsumption > 0 ? 'text-cyan-400' : 'text-rose-400'
						)}
					>
						{((1 - specificConsumption / targetConsumption) * 100).toFixed(1)}%
					</div>
					<div class="text-xs text-slate-500">{$_('oee.gasSavings')}</div>
				</div>
			</div>
		</div>
	</div>
</Card>
