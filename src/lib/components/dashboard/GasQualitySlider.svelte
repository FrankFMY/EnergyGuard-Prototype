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
		if (gasQuality === 1.0) triggerScenarioEvent('Эталон', 'info');
		else if (gasQuality === 0.85) triggerScenarioEvent('Загрязнение', 'warning');
		else if (gasQuality === 0.72) triggerScenarioEvent('Авария', 'error');
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
			return `Убыток ${loss.toFixed(0)} ₽/час. Причина: низкое качество газа. Рекомендация: проверка фильтров.`;
		}
		return 'Оптимальная работа. Качество топлива в пределах нормы.';
	};
</script>

<Card class={cn('border-slate-800 bg-slate-900/50 p-6', className)}>
	<div class="mb-6 flex items-center justify-between">
		<h3 class="flex items-center gap-2 text-lg font-semibold text-white">
			<Fuel class="h-5 w-5 text-cyan-400" />
			{$_('demo.gasQualitySim')}
		</h3>
		<Badge variant={gasQuality > 0.9 ? 'success' : gasQuality > 0.8 ? 'warning' : 'danger'}>
			{gasQuality === 1.0 ? 'Чистый Метан' : 'Низкое качество'}
		</Badge>
	</div>

	<div class="space-y-8">
		<!-- Slider Control -->
		<div class="space-y-4">
			<div class="flex justify-between text-sm font-medium">
				<span class="text-slate-400">{$_('demo.gasQualityIndex')}</span>
				<span class="font-mono text-cyan-400">{(gasQuality * 100).toFixed(0)}%</span>
			</div>
			<div class="relative py-4">
				<input
					type="range"
					min="0.7"
					max="1.0"
					step="0.01"
					bind:value={gasQuality}
					class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-500 transition-all hover:accent-cyan-400"
				/>
			</div>
			<div class="flex justify-between font-mono text-[10px] text-slate-500">
				<span>0.7 (ГРЯЗНЫЙ)</span>
				<span>0.8</span>
				<span>0.9</span>
				<span>1.0 (ЧИСТЫЙ)</span>
			</div>
		</div>

		<!-- Scenario Presets -->
		<div class="grid grid-cols-3 gap-2">
			<button
				type="button"
				class={cn(
					'rounded-lg border border-slate-700 py-2 text-xs font-medium transition-all hover:bg-slate-800',
					gasQuality === 1.0 ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'text-slate-400'
				)}
				onclick={() => (gasQuality = 1.0)}
			>
				Эталон (100%)
			</button>
			<button
				type="button"
				class={cn(
					'rounded-lg border border-slate-700 py-2 text-xs font-medium transition-all hover:bg-slate-800',
					gasQuality === 0.85 ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'text-slate-400'
				)}
				onclick={() => (gasQuality = 0.85)}
			>
				Загрязнение (85%)
			</button>
			<button
				type="button"
				class={cn(
					'rounded-lg border border-slate-700 py-2 text-xs font-medium transition-all hover:bg-slate-800',
					gasQuality === 0.72 ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'text-slate-400'
				)}
				onclick={() => (gasQuality = 0.72)}
			>
				Авария (72%)
			</button>
		</div>

		<!-- Real-time Metrics -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- Power Output -->
			<div class="rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10">
				<div class="mb-1 flex items-center gap-2 text-xs text-slate-400">
					<Zap class="h-3 w-3" />
					{$_('demo.expectedPower')}
				</div>
				<div class="flex items-baseline gap-2">
					<span class="text-2xl font-bold text-white">
						<NumberTicker value={deratedPower} currency="kW" />
					</span>
				</div>
				<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
					<div
						class="h-full bg-emerald-500 transition-all duration-500"
						style="width: {relativeEfficiency}%"
					></div>
				</div>
			</div>

			<!-- Temperature -->
			<div class="rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10">
				<div class="mb-1 flex items-center gap-2 text-xs text-slate-400">
					<Thermometer class="h-3 w-3" />
					{$_('demo.exhaustTemp')}
				</div>
				<div class="flex items-baseline gap-2">
					<span class={cn('text-2xl font-bold transition-colors', getTempColor(temperature))}>
						{temperature.toFixed(1)}°C
					</span>
				</div>
				<div class="mt-2">
					<Badge variant={getTempBadgeVariant(temperature)}>
						{temperature > ENGINE_CONSTANTS.CRITICAL_TEMP_THRESHOLD
							? 'КРИТИЧЕСКИЙ'
							: temperature > ENGINE_CONSTANTS.WARNING_TEMP_THRESHOLD
								? 'ПРЕДУПРЕЖДЕНИЕ'
								: 'НОРМА'}
					</Badge>
				</div>
			</div>
		</div>

		<!-- Financial Impact -->
		<div class="relative overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/10 p-5">
			<div class="absolute -top-4 -right-4 text-rose-500/10">
				<Banknote class="h-24 w-24" />
			</div>

			<div class="flex items-start justify-between">
				<div>
					<div
						class="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-rose-400 uppercase"
					>
						<TrendingDown class="h-3 w-3" />
						{$_('demo.lostRevenuePerHour')}
					</div>
					<div class="text-3xl font-black text-rose-500">
						<NumberTicker value={lostRevenue} currency="₽" />
					</div>
				</div>

				<div class="text-right">
					<div class="text-xs text-slate-500">{$_('demo.powerDeficit')}</div>
					<div class="font-mono text-sm text-rose-400">-{powerLoss.toFixed(1)} кВт</div>
				</div>
			</div>

			<div
				class="mt-4 flex items-center gap-2 rounded bg-rose-500/20 p-2 text-[10px] text-rose-300"
			>
				<TriangleAlert class="h-3 w-3 shrink-0" />
				<span>
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
