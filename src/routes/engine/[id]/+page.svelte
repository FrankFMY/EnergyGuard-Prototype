<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	// @ts-expect-error echarts type definition issues
	import * as echarts from 'echarts';
	import { base } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import Activity from 'lucide-svelte/icons/activity';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Cpu from 'lucide-svelte/icons/cpu';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';

	interface ChartDataPoint {
		time: string;
		temp: number;
		power: number;
	}

	interface EngineData {
		temp: number;
		power: number;
	}

	let engineId = $state($page.params.id);
	let chartContainer = $state<HTMLDivElement>();
	let chartInstance: echarts.ECharts;
	let interval: ReturnType<typeof setInterval>;
	let engineData: EngineData | null = $state(null);

	// Mock Cylinder Temps (4x5 Grid)
	let cylinderTemps = $state(Array(20).fill(480));

	async function updateData() {
		try {
			// Fetch history
			const res = await fetch(`${base}/api/history/${engineId}`);
			if (!res.ok) return;
			const history: ChartDataPoint[] = await res.json();

			if (history.length > 0) {
				const latest = history[history.length - 1];
				engineData = latest;

				// Update Chart
				const times = history.map((d) => new Date(d.time).toLocaleTimeString());
				const temps = history.map((d) => d.temp);
				const powers = history.map((d) => d.power);

				chartInstance.setOption({
					tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
					grid: { left: '5%', right: '5%', bottom: '10%', top: '15%' },
					legend: { data: ['Power (kW)', 'Exhaust Temp (°C)'], textStyle: { color: '#94a3b8' } },
					xAxis: { type: 'category', data: times, axisLabel: { color: '#64748b' } },
					yAxis: [
						{
							type: 'value',
							name: 'Power',
							position: 'left',
							axisLabel: { color: '#64748b' },
							splitLine: { lineStyle: { color: '#1e293b' } }
						},
						{
							type: 'value',
							name: 'Temp',
							position: 'right',
							axisLabel: { color: '#64748b' },
							splitLine: { show: false }
						}
					],
					series: [
						{
							name: 'Power (kW)',
							type: 'bar',
							data: powers,
							itemStyle: {
								color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
									{ offset: 0, color: '#06b6d4' },
									{ offset: 1, color: '#3b82f6' }
								])
							}
						},
						{
							name: 'Exhaust Temp (°C)',
							type: 'line',
							yAxisIndex: 1,
							data: temps,
							smooth: true,
							lineStyle: { color: '#f43f5e', width: 3 },
							symbol: 'none'
						}
					]
				});

				// Update Heatmap Mock Logic
				// If temp is high, make random cylinder hot
				cylinderTemps = cylinderTemps.map(() => 470 + Math.random() * 20);
				if (latest.temp > 520) {
					cylinderTemps[11] = 650; // Cylinder 12 overheating
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	onMount(() => {
		if (chartContainer) chartInstance = echarts.init(chartContainer);
		updateData();
		interval = setInterval(updateData, 1000);
		window.addEventListener('resize', () => chartInstance?.resize());
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		chartInstance?.dispose();
	});

	function getCylinderColor(temp: number) {
		if (temp > 600) return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse';
		if (temp > 500) return 'bg-amber-500';
		return 'bg-emerald-500/20';
	}
</script>

<div class="mb-6 flex items-center gap-4">
	<a
		href="{base}/"
		class="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
	>
		← Back to Fleet
	</a>
	<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
		<Cpu class="text-cyan-400" />
		Engine Details: <span class="text-cyan-400">{engineId?.toUpperCase()}</span>
	</h1>
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
	<!-- Left Column: KPIs (3 cols) -->
	<div class="space-y-4 lg:col-span-3">
		<div class="glass-card rounded-xl p-6">
			<h3 class="mb-4 text-sm font-medium text-slate-400">Real-time Metrics</h3>

			<div class="space-y-6">
				<div>
					<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
						<Activity size={14} /> Power Output
					</div>
					<div class="font-mono text-2xl font-bold text-white">
						{engineData?.power?.toFixed(0) ?? '---'} <span class="text-sm text-slate-500">kW</span>
					</div>
				</div>

				<div>
					<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
						<Thermometer size={14} /> Exhaust Temp
					</div>
					<div
						class={cn(
							'font-mono text-2xl font-bold',
							(engineData?.temp ?? 0) > 500 ? 'text-rose-400' : 'text-white'
						)}
					>
						{engineData?.temp?.toFixed(0) ?? '---'} <span class="text-sm text-slate-500">°C</span>
					</div>
				</div>

				<div>
					<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
						<Gauge size={14} /> Efficiency
					</div>
					<div class="font-mono text-2xl font-bold text-emerald-400">
						42.5 <span class="text-sm text-emerald-500/50">%</span>
					</div>
				</div>
			</div>
		</div>

		<div class="glass-card rounded-xl bg-linear-to-br from-slate-900 to-slate-800 p-6">
			<h3 class="mb-2 text-sm font-medium text-slate-400">AI Diagnostic</h3>
			{#if (engineData?.temp ?? 0) > 520}
				<div class="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
					<div class="mb-1 flex items-center gap-2 text-sm font-bold text-rose-400">
						<TriangleAlert size={14} /> Critical Overheat
					</div>
					<p class="text-xs text-rose-200/70">
						Correlation detected: Cylinder #12 misfire causing exhaust spike. Recommended: Check
						injector.
					</p>
				</div>
			{:else}
				<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
					<div class="text-sm font-bold text-emerald-400">Optimal Operation</div>
					<p class="text-xs text-emerald-200/70">Performance matches digital twin baseline.</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Center Column: Combo Chart (6 cols) -->
	<div class="lg:col-span-6">
		<div class="glass-card flex h-[500px] flex-col rounded-xl p-6">
			<h3 class="mb-4 text-sm font-medium text-slate-400">Performance Correlation</h3>
			<div bind:this={chartContainer} class="w-full flex-1"></div>
		</div>
	</div>

	<!-- Right Column: Heatmap (3 cols) -->
	<div class="lg:col-span-3">
		<div class="glass-card h-full rounded-xl p-6">
			<h3 class="mb-6 flex items-center justify-between text-sm font-medium text-slate-400">
				Cylinder Temps
				<span class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-500">Top View</span>
			</h3>

			<div class="grid grid-cols-4 gap-3">
				{#each cylinderTemps as temp, i (i)}
					<div
						class="group relative flex aspect-square items-center justify-center rounded-md text-xs font-bold text-white/50 transition-all duration-500 {getCylinderColor(
							temp
						)}"
					>
						{i + 1}

						<!-- Tooltip -->
						<div
							class="absolute bottom-full z-10 mb-2 hidden rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block"
						>
							Cyl {i + 1}: {temp.toFixed(0)}°C
						</div>
					</div>
				{/each}
			</div>

			<div class="mt-8 space-y-2">
				<div class="flex items-center gap-2 text-xs text-slate-500">
					<div class="h-3 w-3 rounded bg-emerald-500/20"></div>
					Normal (450-490°C)
				</div>
				<div class="flex items-center gap-2 text-xs text-slate-500">
					<div class="h-3 w-3 rounded bg-amber-500"></div>
					Warning (>500°C)
				</div>
				<div class="flex items-center gap-2 text-xs text-slate-500">
					<div class="h-3 w-3 animate-pulse rounded bg-rose-500"></div>
					Critical (>600°C)
				</div>
			</div>
		</div>
	</div>
</div>
