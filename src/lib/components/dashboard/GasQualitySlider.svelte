<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card, Badge } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import NumberTicker from '$lib/components/NumberTicker.svelte';
	import {
		calculatePowerDerating,
		calculateTemperatureFromGasQuality,
		calculateLostRevenue,
		calculateGasEfficiency
	} from '$lib/services/gas-quality.service.js';
	import { ENGINE_CONSTANTS } from '$lib/types/index.js';
	import Fuel from 'lucide-svelte/icons/fuel';
	import Zap from 'lucide-svelte/icons/zap';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import TrendingDown from 'lucide-svelte/icons/trending-down';
	import Banknote from 'lucide-svelte/icons/banknote';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import { base } from '$app/paths';
	import { currency as currencyState } from '$lib/state/currency.svelte.js';

	interface Props {
		class?: string;
		engineId?: string;
		nominalPower?: number;
		baseTemp?: number;
		onchange?: (detail: {
			gasQuality: number;
			temperature: number;
			deratedPower: number;
			efficiency: number;
		}) => void;
	}

	const {
		class: className = '',
		engineId = 'gpu-1',
		nominalPower = 1200,
		baseTemp = 450,
		onchange
	}: Props = $props();

	// State for the slider
	let gasQuality = $state(1.0);
	let lastScenario = $state<string | null>(null);

	async function triggerScenarioEvent(name: string, level: 'info' | 'warning' | 'error') {
		if (lastScenario === name) return;
		lastScenario = name;

		try {
			await fetch(`${base}/api/events`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: `SIMULATOR: Режим "${name}" активирован пользователем.`,
					level,
					engine_id: engineId
				})
			});
		} catch (e) {
			console.error('Failed to log simulator event', e);
		}
	}

	// Reactive calculations
	const deratedPower = $derived(calculatePowerDerating(gasQuality, nominalPower));
	const temperature = $derived(calculateTemperatureFromGasQuality(gasQuality, baseTemp));
	const powerLoss = $derived(nominalPower - deratedPower);
	const lostRevenue = $derived(calculateLostRevenue(powerLoss));
	const efficiency = $derived(calculateGasEfficiency(gasQuality));
	const relativeEfficiency = $derived((deratedPower / nominalPower) * 100);

	// Emit changes to parent
	$effect(() => {
		onchange?.({
			gasQuality,
			temperature,
			deratedPower,
			efficiency
		});

		// Trigger simulator audit event
		if (gasQuality === 1.0) triggerScenarioEvent($_('demo.scenarios.reference'), 'info');
		else if (gasQuality === 0.85) triggerScenarioEvent($_('demo.scenarios.contamination'), 'warning');
		else if (gasQuality === 0.72) triggerScenarioEvent($_('demo.scenarios.emergency'), 'error');
	});

	const getTempColor = (t: number) => {
		if (t > ENGINE_CONSTANTS.CRITICAL_TEMP_THRESHOLD) return 'text-rose-500';
		if (t > ENGINE_CONSTANTS.WARNING_TEMP_THRESHOLD) return 'text-amber-500';
		return 'text-emerald-500';
	};

	const getTempBadgeVariant = (t: number) => {
		if (t > ENGINE_CONSTANTS.CRITICAL_TEMP_THRESHOLD) return 'danger';
		if (t > ENGINE_CONSTANTS.WARNING_TEMP_THRESHOLD) return 'warning';
		return 'success';
	};

	const getAlertText = (gq: number, loss: number) => {
		if (gq < 0.9) {
			const formattedLoss = currencyState.format(loss);
			return $_('demo.alertLoss', { values: { loss: formattedLoss } });
		}
		return $_('demo.alertOptimal');
	};
</script>

<Card class={cn('border-slate-800 bg-slate-900/50', className)}>
	<div class="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
		<h3 class="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
			<Fuel class="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
			{$_('demo.gasQualitySim')}
		</h3>
		<Badge variant={gasQuality > 0.9 ? 'success' : gasQuality > 0.8 ? 'warning' : 'danger'}>
			{gasQuality === 1.0 ? $_('demo.pureMethane') : $_('demo.lowQuality')}
		</Badge>
	</div>

	<div class="space-y-5 sm:space-y-8">
		<!-- Slider Control -->
		<div class="space-y-3 sm:space-y-4">
			<div class="flex justify-between text-xs font-medium sm:text-sm">
				<span class="text-slate-400">{$_('demo.gasQualityIndex')}</span>
				<span class="font-mono text-cyan-400">{(gasQuality * 100).toFixed(0)}%</span>
			</div>
			<div class="relative py-3 sm:py-4">
				<input
					type="range"
					min="0.7"
					max="1.0"
					step="0.01"
					bind:value={gasQuality}
					class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-500 transition-all hover:accent-cyan-400"
				/>
			</div>
			<div class="flex justify-between font-mono text-[9px] text-slate-500 sm:text-[10px]">
				<span>0.7</span>
				<span>0.8</span>
				<span>0.9</span>
				<span>1.0</span>
			</div>
		</div>

		<!-- Scenario Presets -->
		<div class="grid grid-cols-3 gap-1.5 sm:gap-2">
			<button
				type="button"
				class={cn(
					'rounded-lg border border-slate-700 min-h-[44px] py-2 text-[10px] font-medium transition-all duration-200 hover:bg-slate-800 active:scale-95 sm:min-h-0 sm:py-2.5 sm:text-xs',
					gasQuality === 1.0
						? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/10'
						: 'text-slate-400'
				)}
				onclick={() => (gasQuality = 1.0)}
			>
				<span class="hidden sm:inline">{$_('demo.scenarios.reference')}</span>
				<span class="sm:hidden">100%</span>
			</button>
			<button
				type="button"
				class={cn(
					'rounded-lg border border-slate-700 min-h-[44px] py-2 text-[10px] font-medium transition-all duration-200 hover:bg-slate-800 active:scale-95 sm:min-h-0 sm:py-2.5 sm:text-xs',
					gasQuality === 0.85
						? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10'
						: 'text-slate-400'
				)}
				onclick={() => (gasQuality = 0.85)}
			>
				<span class="hidden sm:inline">{$_('demo.scenarios.contamination')}</span>
				<span class="sm:hidden">85%</span>
			</button>
			<button
				type="button"
				class={cn(
					'rounded-lg border border-slate-700 min-h-[44px] py-2 text-[10px] font-medium transition-all duration-200 hover:bg-slate-800 active:scale-95 sm:min-h-0 sm:py-2.5 sm:text-xs',
					gasQuality === 0.72
						? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/10'
						: 'text-slate-400'
				)}
				onclick={() => (gasQuality = 0.72)}
			>
				<span class="hidden sm:inline">{$_('demo.scenarios.emergency')}</span>
				<span class="sm:hidden">72%</span>
			</button>
		</div>

		<!-- Real-time Metrics -->
		<div class="grid grid-cols-2 gap-3 sm:gap-4">
			<!-- Power Output -->
			<div class="rounded-xl bg-white/5 p-3 transition-all duration-200 hover:bg-white/10 sm:p-4">
				<div class="mb-1 flex items-center gap-1.5 text-[10px] text-slate-400 sm:gap-2 sm:text-xs">
					<Zap class="h-3 w-3" />
					<span class="truncate">{$_('demo.expectedPower')}</span>
				</div>
				<div class="flex items-baseline gap-1 sm:gap-2">
					<span class="text-lg font-bold text-white tabular-nums sm:text-2xl">
						<NumberTicker value={deratedPower} unit="kW" />
					</span>
				</div>
				<div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800 sm:h-1.5">
					<div
						class="h-full bg-emerald-500 transition-all duration-500"
						style="width: {relativeEfficiency}%"
					></div>
				</div>
			</div>

			<!-- Temperature -->
			<div class="rounded-xl bg-white/5 p-3 transition-all duration-200 hover:bg-white/10 sm:p-4">
				<div class="mb-1 flex items-center gap-1.5 text-[10px] text-slate-400 sm:gap-2 sm:text-xs">
					<Thermometer class="h-3 w-3" />
					<span class="truncate">{$_('demo.exhaustTemp')}</span>
				</div>
				<div class="flex items-baseline gap-1 sm:gap-2">
					<span
						class={cn(
							'text-lg font-bold tabular-nums transition-colors sm:text-2xl',
							getTempColor(temperature)
						)}
					>
						{temperature.toFixed(0)}°C
					</span>
				</div>
				<div class="mt-2">
					<Badge variant={getTempBadgeVariant(temperature)} size="sm">
						{temperature > ENGINE_CONSTANTS.CRITICAL_TEMP_THRESHOLD
							? $_('demo.tempCritical')
							: temperature > ENGINE_CONSTANTS.WARNING_TEMP_THRESHOLD
								? $_('demo.tempWarning')
								: 'OK'}
					</Badge>
				</div>
			</div>
		</div>

		<!-- Financial Impact -->
		<div
			class="relative overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 sm:p-5"
		>
			<div class="absolute -top-4 -right-4 text-rose-500/10">
				<Banknote class="h-16 w-16 sm:h-24 sm:w-24" />
			</div>

			<div class="flex items-start justify-between gap-2">
				<div>
					<div
						class="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-rose-400 uppercase sm:gap-2 sm:text-xs"
					>
						<TrendingDown class="h-3 w-3" />
						<span class="hidden sm:inline">{$_('demo.lostRevenuePerHour')}</span>
						<span class="sm:hidden">Убыток/час</span>
					</div>
					<div class="text-2xl font-black text-rose-500 tabular-nums sm:text-3xl">
						<NumberTicker value={lostRevenue} isCurrency={true} />
					</div>
				</div>

				<div class="text-right">
					<div class="text-[10px] text-slate-500 sm:text-xs">{$_('demo.powerDeficit')}</div>
					<div class="font-mono text-xs text-rose-400 tabular-nums sm:text-sm">
						-{powerLoss.toFixed(0)} {$_('units.kw')}
					</div>
				</div>
			</div>

			<div
				class="mt-3 flex items-start gap-2 rounded bg-rose-500/20 p-2 text-[9px] text-rose-300 sm:mt-4 sm:text-[10px]"
			>
				<TriangleAlert class="mt-0.5 h-3 w-3 shrink-0" />
				<span class="leading-relaxed">
					{getAlertText(gasQuality, lostRevenue)}
				</span>
			</div>
		</div>
	</div>
</Card>

<style>
	input[type='range']::-webkit-slider-runnable-track {
		background-color: #1e293b; /* bg-slate-800 */
		border-radius: 0.5rem; /* rounded-lg */
		height: 0.5rem;
	}
	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		height: 1.5rem; /* h-6 for touch */
		width: 1.5rem; /* w-6 for touch */
		background-color: #06b6d4; /* bg-cyan-500 */
		border-radius: 9999px; /* rounded-full */
		cursor: pointer;
		margin-top: -0.5rem;
		box-shadow: 0 10px 15px -3px rgba(6, 182, 212, 0.5);
		transition: transform 0.2s;
	}
	input[type='range']::-webkit-slider-thumb:hover {
		transform: scale(1.25);
	}
</style>
