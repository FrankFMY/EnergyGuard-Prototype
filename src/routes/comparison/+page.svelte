<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { base } from '$app/paths';
	import { Card } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import BarChart from 'lucide-svelte/icons/bar-chart-3';
	import Plus from 'lucide-svelte/icons/plus';
	import X from 'lucide-svelte/icons/x';
	import Activity from 'lucide-svelte/icons/activity';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Zap from 'lucide-svelte/icons/zap';
	import type { EngineWithMetrics } from '$lib/types/index.js';

	let engines: EngineWithMetrics[] = $state([]);
	let selectedEngines: string[] = $state(['gpu-1', 'gpu-2']);
	let chartContainer = $state<HTMLDivElement>();
	type EChartsInstance = {
		dispose: () => void;
		resize: () => void;
		setOption: (option: unknown, notMerge?: boolean, lazyUpdate?: boolean) => void;
	};
	let chartInstance: EChartsInstance | null = null;

	let loadingError = $state<string | null>(null);
	let isDataLoading = $state(false);
	let usingFallback = $state(false);

	// Fallback данные для презентации - если БД недоступна
	const FALLBACK_ENGINES: EngineWithMetrics[] = [
		{ id: 'gpu-1', model: 'Jenbacher J620', status: 'ok', total_hours: 12450, planned_power_kw: 1200, power_kw: 1180, temp: 485, gas_consumption: 280, vibration: 4.2, gas_pressure: 2.8, profit_rate: 2840, efficiency: 87 },
		{ id: 'gpu-2', model: 'Jenbacher J620', status: 'ok', total_hours: 11200, planned_power_kw: 1200, power_kw: 1150, temp: 478, gas_consumption: 275, vibration: 3.8, gas_pressure: 2.7, profit_rate: 2720, efficiency: 85 },
		{ id: 'gpu-3', model: 'Caterpillar G3520', status: 'warning', total_hours: 15800, planned_power_kw: 1200, power_kw: 1050, temp: 512, gas_consumption: 295, vibration: 6.5, gas_pressure: 2.5, profit_rate: 2180, efficiency: 78 },
		{ id: 'gpu-4', model: 'Caterpillar G3520', status: 'ok', total_hours: 9600, planned_power_kw: 1200, power_kw: 1220, temp: 468, gas_consumption: 270, vibration: 3.5, gas_pressure: 2.9, profit_rate: 3050, efficiency: 91 },
		{ id: 'gpu-5', model: 'MWM TCG 2020', status: 'ok', total_hours: 8400, planned_power_kw: 1200, power_kw: 1190, temp: 475, gas_consumption: 268, vibration: 4.0, gas_pressure: 2.8, profit_rate: 2920, efficiency: 89 },
		{ id: 'gpu-6', model: 'MWM TCG 2020', status: 'error', total_hours: 18200, planned_power_kw: 1200, power_kw: 0, temp: 45, gas_consumption: 0, vibration: 0.1, gas_pressure: 0, profit_rate: 0, efficiency: 0 }
	];

	/**
	 * Fetch с таймаутом и retry логикой
	 */
	async function fetchWithRetry(url: string, retries = 3, timeout = 20000): Promise<Response> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);

				const res = await fetch(url, { signal: controller.signal });
				clearTimeout(timeoutId);

				if (res.ok) return res;

				// Если сервер ответил ошибкой, не делаем retry
				throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			} catch (e) {
				lastError = e instanceof Error ? e : new Error('Unknown error');

				// Не делаем retry для HTTP ошибок (только для таймаутов/сети)
				if (lastError.message.startsWith('HTTP')) throw lastError;

				// Экспоненциальная задержка: 1s, 2s, 4s
				if (attempt < retries) {
					const delay = Math.pow(2, attempt - 1) * 1000;
					console.log(`[Comparison] Attempt ${attempt} failed, retrying in ${delay}ms...`);
					await new Promise(r => setTimeout(r, delay));
				}
			}
		}

		throw lastError || new Error('All retry attempts failed');
	}

	async function loadData() {
		isDataLoading = true;
		loadingError = null;
		usingFallback = false;

		try {
			const res = await fetchWithRetry(`${base}/api/status`);
			const data = await res.json();
			engines = data.engines;
		} catch (e) {
			console.error('[Comparison] Failed to load data after retries:', e);

			// Используем fallback данные для презентации
			engines = FALLBACK_ENGINES;
			usingFallback = true;
			// Не показываем ошибку пользователю - данные есть (fallback)
		} finally {
			isDataLoading = false;
			await tick();
			updateChart();
		}
	}

	async function updateChart() {
		if (!chartContainer) return;

		const echarts = await import('echarts');
		if (!chartInstance) {
			chartInstance = echarts.init(chartContainer);
		}

		// Если нет выбранных двигателей, очищаем график
		if (selectedEngines.length === 0) {
			chartInstance?.setOption({ series: [] }, true);
			return;
		}

		const selected = engines.filter((e) => selectedEngines.includes(e.id));
		const isMobile = window.innerWidth < 640;

		// Используем notMerge: true чтобы полностью заменить опции и удалить старые серии
		chartInstance?.setOption({
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				backgroundColor: 'rgba(15, 23, 42, 0.9)',
				borderColor: '#334155',
				textStyle: { color: '#f8fafc' }
			},
			legend: {
				data: selected.map((e) => e.id.toUpperCase()),
				textStyle: { color: '#94a3b8' },
				top: 0
			},
			grid: {
				left: isMobile ? '8%' : '3%',
				right: '4%',
				bottom: isMobile ? '15%' : '3%',
				top: '15%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: isMobile
					? [
							$_('comparison.powerShort'),
							$_('comparison.tempShort'),
							$_('comparison.vibShort'),
							$_('comparison.effShort')
						]
					: [
							$_('comparison.powerOutput'),
							$_('engine.temp'),
							$_('engine.vibration'),
							$_('engine.efficiency')
						],
				axisLabel: {
					color: '#64748b',
					rotate: isMobile ? 30 : 0,
					fontSize: isMobile ? 10 : 12
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: '#64748b', fontSize: isMobile ? 10 : 12 },
				splitLine: { lineStyle: { color: '#1e293b' } }
			},
			series: selected.map((engine, i) => ({
				name: engine.id.toUpperCase(),
				type: 'bar',
				data: [
					engine.power_kw,
					engine.temp,
					engine.vibration * 100,
					(engine.power_kw / 1500) * 100
				],
				itemStyle: {
					color: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'][i % 4]
				},
				barMaxWidth: isMobile ? 30 : 50
			}))
		}, true); // notMerge: true - полностью заменяем опции, удаляя старые серии
	}

	function toggleEngine(engineId: string) {
		if (selectedEngines.includes(engineId)) {
			if (selectedEngines.length > 1) {
				selectedEngines = selectedEngines.filter((e) => e !== engineId);
			}
		} else if (selectedEngines.length < 4) {
			selectedEngines = [...selectedEngines, engineId];
		}
		updateChart();
	}

	onMount(() => {
		loadData();
		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		chartInstance?.dispose();
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', handleResize);
		}
	});

	function handleResize() {
		chartInstance?.resize();
		// Redraw chart with new mobile/desktop settings
		updateChart();
	}

	// Автоматически обновляем график когда контейнер готов и данные загружены
	$effect(() => {
		if (chartContainer && engines.length > 0 && selectedEngines.length > 0 && !isDataLoading) {
			updateChart();
		}
	});

	const selectedEngineData = $derived(engines.filter((e) => selectedEngines.includes(e.id)));

	const fleetAverage = $derived.by(() => {
		if (engines.length === 0) return { power: 0, temp: 0, vibration: 0 };
		return {
			power: engines.reduce((sum, e) => sum + e.power_kw, 0) / engines.length,
			temp: engines.reduce((sum, e) => sum + e.temp, 0) / engines.length,
			vibration: engines.reduce((sum, e) => sum + e.vibration, 0) / engines.length
		};
	});
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<BarChart class="h-7 w-7 text-cyan-400" />
			{#if !$isLoading}{$_('comparison.title')}{:else}Сравнение двигателей{/if}
		</h1>
		<p class="mt-1 text-sm text-slate-400">
			{#if !$isLoading}{$_('comparison.subtitle')}{:else}Сравнение метрик производительности{/if}
		</p>
	</div>

	<!-- Fallback Warning (subtle, for demo/presentation) -->
	{#if usingFallback}
		<div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
			⚡ Демо-режим: показаны примерные данные
		</div>
	{/if}

	<!-- Engine Selection -->
	{#if !isDataLoading && !loadingError}
		<Card class="p-4">
			<div class="mb-3 text-sm text-slate-400">
				{#if !$isLoading}{$_('comparison.selectEngines')}{:else}Выберите двигатели (макс 4){/if}:
			</div>
			<div class="flex flex-wrap gap-2">
				{#each engines as engine (engine.id)}
					<button
						type="button"
						class={cn(
							'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
							selectedEngines.includes(engine.id)
								? 'bg-cyan-500 text-white'
								: 'bg-slate-800 text-slate-400 hover:bg-slate-700'
						)}
						onclick={() => toggleEngine(engine.id)}
					>
						{engine.id.toUpperCase()}
						{#if selectedEngines.includes(engine.id)}
							<X class="h-3 w-3" />
						{:else}
							<Plus class="h-3 w-3" />
						{/if}
					</button>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Loading/Error State -->
	{#if isDataLoading}
		<Card class="p-8 text-center">
			<div class="flex flex-col items-center gap-4">
				<div class="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-500"></div>
				<p class="text-slate-400">{$_('common.loading')}</p>
			</div>
		</Card>
	{:else if loadingError}
		<Card class="p-8 text-center">
			<div class="flex flex-col items-center gap-4">
				<div class="text-rose-400">⚠️</div>
				<p class="text-slate-300">{loadingError}</p>
				<button
					type="button"
					onclick={loadData}
					class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600"
				>
					{$_('common.retry')}
				</button>
			</div>
		</Card>
	{/if}

	<!-- Comparison Chart -->
	{#if !isDataLoading && !loadingError}
		<Card>
			<h3 class="mb-4 text-lg font-semibold text-white">
				{#if !$isLoading}{$_('comparison.performanceComparison')}{:else}Сравнение производительности{/if}
			</h3>
			<div class="h-64 w-full sm:h-80" bind:this={chartContainer}></div>
		</Card>
	{/if}

	<!-- Metrics - Mobile Card View -->
	{#if !isDataLoading && !loadingError}
		<div class="space-y-4 md:hidden">
		<h3 class="text-lg font-semibold text-white">
			{#if !$isLoading}{$_('comparison.metrics')}{:else}Метрики{/if}
		</h3>
		{#each selectedEngineData as engine (engine.id)}
			<Card class="p-4">
				<h4 class="mb-3 text-lg font-bold text-cyan-400">{engine.id.toUpperCase()}</h4>
				<div class="grid grid-cols-2 gap-3">
					<div class="rounded-lg bg-slate-800/50 p-3">
						<div class="mb-1 flex items-center gap-2 text-xs text-slate-400">
							<Activity class="h-3 w-3 text-cyan-400" />
							{#if !$isLoading}{$_('comparison.powerOutput')}{:else}Мощность{/if}
						</div>
						<div class="font-mono text-lg text-white">
							{engine.power_kw.toFixed(0)}
							{$_('units.kw')}
						</div>
					</div>
					<div class="rounded-lg bg-slate-800/50 p-3">
						<div class="mb-1 flex items-center gap-2 text-xs text-slate-400">
							<Thermometer class="h-3 w-3 text-rose-400" />
							{#if !$isLoading}{$_('comparison.exhaustTemp')}{:else}Температура{/if}
						</div>
						<div class="font-mono text-lg {engine.temp > 500 ? 'text-rose-400' : 'text-white'}">
							{engine.temp.toFixed(0)}{$_('units.celsius')}
						</div>
					</div>
					<div class="rounded-lg bg-slate-800/50 p-3">
						<div class="mb-1 flex items-center gap-2 text-xs text-slate-400">
							<Gauge class="h-3 w-3 text-amber-400" />
							{#if !$isLoading}{$_('engine.vibration')}{:else}Вибрация{/if}
						</div>
						<div class="font-mono text-lg {engine.vibration > 8 ? 'text-amber-400' : 'text-white'}">
							{engine.vibration.toFixed(1)}
							{$_('units.mms')}
						</div>
					</div>
					<div class="rounded-lg bg-slate-800/50 p-3">
						<div class="mb-1 flex items-center gap-2 text-xs text-slate-400">
							<Zap class="h-3 w-3 text-emerald-400" />
							{#if !$isLoading}{$_('comparison.profitability')}{:else}Прибыль{/if}
						</div>
						<div
							class="font-mono text-lg {engine.profit_rate > 0
								? 'text-emerald-400'
								: 'text-rose-400'}"
						>
							{engine.profit_rate > 0 ? '+' : ''}{engine.profit_rate.toFixed(0)}
						</div>
					</div>
				</div>
			</Card>
		{/each}

		<!-- Fleet Average Card Mobile -->
		<Card class="border-slate-700 bg-slate-800/30 p-4">
			<h4 class="mb-3 text-sm font-semibold text-slate-400">
				{#if !$isLoading}{$_('comparison.fleetAvg')}{:else}Среднее по парку{/if}
			</h4>
			<div class="grid grid-cols-3 gap-2 text-center">
				<div>
					<div class="text-xs text-slate-500">
						{#if !$isLoading}{$_('comparison.powerShort')}{:else}Мощн.{/if}
					</div>
					<div class="font-mono text-sm text-slate-300">{fleetAverage.power.toFixed(0)}</div>
				</div>
				<div>
					<div class="text-xs text-slate-500">
						{#if !$isLoading}{$_('comparison.tempShort')}{:else}Темп.{/if}
					</div>
					<div class="font-mono text-sm text-slate-300">{fleetAverage.temp.toFixed(0)}°</div>
				</div>
				<div>
					<div class="text-xs text-slate-500">
						{#if !$isLoading}{$_('comparison.vibShort')}{:else}Вибр.{/if}
					</div>
					<div class="font-mono text-sm text-slate-300">{fleetAverage.vibration.toFixed(1)}</div>
				</div>
			</div>
		</Card>
		</div>
	{/if}

	<!-- Metrics Table - Desktop -->
	{#if !isDataLoading && !loadingError}
	<Card class="hidden overflow-hidden p-0 md:block">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-white/5 bg-slate-800/50">
					<tr>
						<th class="p-4 font-semibold text-slate-300">
							{#if !$isLoading}{$_('comparison.metric')}{:else}Метрика{/if}
						</th>
						{#each selectedEngineData as engine (engine.id)}
							<th class="p-4 font-semibold text-slate-300">{engine.id.toUpperCase()}</th>
						{/each}
						<th class="p-4 font-semibold text-slate-400">
							{#if !$isLoading}{$_('comparison.fleetAvg')}{:else}Среднее{/if}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/5">
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Activity class="h-4 w-4 text-cyan-400" />
								{#if !$isLoading}{$_('comparison.powerOutput')}{:else}Выходная мощность{/if}
							</div>
						</td>
						{#each selectedEngineData as engine (engine.id)}
							<td class="p-4 font-mono text-white">{engine.power_kw.toFixed(0)} {$_('units.kw')}</td
							>
						{/each}
						<td class="p-4 font-mono text-slate-400"
							>{fleetAverage.power.toFixed(0)} {$_('units.kw')}</td
						>
					</tr>
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Thermometer class="h-4 w-4 text-rose-400" />
								{#if !$isLoading}{$_('comparison.exhaustTemp')}{:else}Температура выхлопа{/if}
							</div>
						</td>
						{#each selectedEngineData as engine (engine.id)}
							<td class="p-4 font-mono {engine.temp > 500 ? 'text-rose-400' : 'text-white'}">
								{engine.temp.toFixed(0)}{$_('units.celsius')}
							</td>
						{/each}
						<td class="p-4 font-mono text-slate-400"
							>{fleetAverage.temp.toFixed(0)}{$_('units.celsius')}</td
						>
					</tr>
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Gauge class="h-4 w-4 text-amber-400" />
								{#if !$isLoading}{$_('engine.vibration')}{:else}Вибрация{/if}
							</div>
						</td>
						{#each selectedEngineData as engine (engine.id)}
							<td class="p-4 font-mono {engine.vibration > 8 ? 'text-amber-400' : 'text-white'}">
								{engine.vibration.toFixed(1)}
								{$_('units.mms')}
							</td>
						{/each}
						<td class="p-4 font-mono text-slate-400"
							>{fleetAverage.vibration.toFixed(1)} {$_('units.mms')}</td
						>
					</tr>
					<tr class="hover:bg-white/5">
						<td class="p-4">
							<div class="flex items-center gap-2 text-slate-300">
								<Zap class="h-4 w-4 text-emerald-400" />
								{#if !$isLoading}{$_('comparison.profitability')}{:else}Рентабельность{/if}
							</div>
						</td>
						{#each selectedEngineData as engine (engine.id)}
							<td
								class="p-4 font-mono {engine.profit_rate > 0
									? 'text-emerald-400'
									: 'text-rose-400'}"
							>
								{engine.profit_rate > 0 ? '+' : ''}{engine.profit_rate.toFixed(0)}
								{$_('units.rubPerHour')}
							</td>
						{/each}
						<td class="p-4 font-mono text-slate-400">
							{(engines.reduce((sum, e) => sum + e.profit_rate, 0) / engines.length).toFixed(0)}
							{$_('units.rubPerHour')}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</Card>
	{/if}

	<!-- Ranking -->
	{#if !isDataLoading && !loadingError}
		<Card>
		<h3 class="mb-4 text-lg font-semibold text-white">
			{#if !$isLoading}{$_('comparison.efficiencyRanking')}{:else}Рейтинг эффективности{/if}
		</h3>
		<div class="space-y-3">
			{#each [...engines].sort((a, b) => b.profit_rate - a.profit_rate) as engine, i (engine.id)}
				<div class="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 sm:gap-4">
					<div
						class={cn(
							'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm',
							i === 0
								? 'bg-amber-500 text-black'
								: i === 1
									? 'bg-slate-400 text-black'
									: i === 2
										? 'bg-amber-700 text-white'
										: 'bg-slate-700 text-slate-400'
						)}
					>
						{i + 1}
					</div>
					<div class="min-w-0 flex-1">
						<div class="font-medium text-white">{engine.id.toUpperCase()}</div>
						<div class="truncate text-xs text-slate-400">{engine.model}</div>
					</div>
					<div class="text-right">
						<div class="font-mono text-base text-emerald-400 sm:text-lg">
							+{engine.profit_rate.toFixed(0)}
							<span class="hidden sm:inline">{$_('units.rubPerHour')}</span>
						</div>
						<div class="text-xs text-slate-500">{engine.power_kw.toFixed(0)} {$_('units.kw')}</div>
					</div>
				</div>
			{/each}
		</div>
	</Card>
	{/if}
</div>
