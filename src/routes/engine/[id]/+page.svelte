<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { base } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import { Card, Badge, Skeleton } from '$lib/components/ui/index.js';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import Activity from 'lucide-svelte/icons/activity';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Cpu from 'lucide-svelte/icons/cpu';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import History from 'lucide-svelte/icons/history';
	import Wrench from 'lucide-svelte/icons/wrench';
	import Brain from 'lucide-svelte/icons/brain';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';

	interface ChartDataPoint {
		time: string;
		temp: number;
		power: number;
	}

	interface EngineData {
		temp: number;
		power: number;
	}

	// Tabs
	type TabId = 'overview' | 'history' | 'maintenance' | 'diagnostics';
	let activeTab: TabId = $state('overview');

	const tabs: { id: TabId; labelKey: string; icon: typeof Activity }[] = [
		{ id: 'overview', labelKey: 'Overview', icon: Activity },
		{ id: 'history', labelKey: 'History', icon: History },
		{ id: 'maintenance', labelKey: 'Maintenance', icon: Wrench },
		{ id: 'diagnostics', labelKey: 'Diagnostics', icon: Brain }
	];

	let engineId = $derived($page.params.id);
	let chartContainer = $state<HTMLDivElement>();
	let chartInstance: unknown;
	let interval: ReturnType<typeof setInterval>;
	let engineData: EngineData | null = $state(null);
	let loading = $state(true);

	// Mock Cylinder Temps (4x5 Grid)
	let cylinderTemps = $state(Array(20).fill(480));

	async function updateData() {
		try {
			const res = await fetch(`${base}/api/history/${engineId}`);
			if (!res.ok) return;
			const history: ChartDataPoint[] = await res.json();

			if (history.length > 0) {
				const latest = history[history.length - 1];
				engineData = latest;
				loading = false;

				// Update Chart if available
				if (chartInstance && typeof chartInstance === 'object' && 'setOption' in chartInstance) {
					const times = history.map((d) => new Date(d.time).toLocaleTimeString());
					const temps = history.map((d) => d.temp);
					const powers = history.map((d) => d.power);

					(chartInstance as { setOption: (opts: unknown) => void }).setOption({
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
									color: {
										type: 'linear',
										x: 0,
										y: 0,
										x2: 0,
										y2: 1,
										colorStops: [
											{ offset: 0, color: '#06b6d4' },
											{ offset: 1, color: '#3b82f6' }
										]
									}
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
				}

				// Update Heatmap
				cylinderTemps = cylinderTemps.map(() => 470 + Math.random() * 20);
				if (latest.temp > 520) {
					cylinderTemps[11] = 650;
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	onMount(async () => {
		// Dynamic import for ECharts
		const echarts = await import('echarts');
		if (chartContainer) {
			chartInstance = echarts.init(chartContainer);
		}
		updateData();
		interval = setInterval(updateData, 2000);
		window.addEventListener('resize', () => {
			if (chartInstance && typeof chartInstance === 'object' && 'resize' in chartInstance) {
				(chartInstance as { resize: () => void }).resize();
			}
		});
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (chartInstance && typeof chartInstance === 'object' && 'dispose' in chartInstance) {
			(chartInstance as { dispose: () => void }).dispose();
		}
	});

	function getCylinderColor(temp: number) {
		if (temp > 600) return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse';
		if (temp > 500) return 'bg-amber-500';
		return 'bg-emerald-500/20';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-4">
			<a
				href="{base}/"
				class="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
			>
				<ArrowLeft class="h-5 w-5" />
			</a>
			<div>
				<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
					<Cpu class="h-6 w-6 text-cyan-400" />
					{$_('engine.details')}: <span class="text-cyan-400">{engineId?.toUpperCase()}</span>
				</h1>
			</div>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 rounded-lg bg-slate-900/50 p-1">
			{#each tabs as tab}
				{@const TabIcon = tab.icon}
				<button
					type="button"
					class={cn(
						'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition',
						activeTab === tab.id
							? 'bg-cyan-500/20 text-cyan-400'
							: 'text-slate-400 hover:bg-white/5 hover:text-white'
					)}
					onclick={() => (activeTab = tab.id)}
				>
					<TabIcon class="h-4 w-4" />
					<span class="hidden md:inline">{tab.labelKey}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if activeTab === 'overview'}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<!-- Left Column: KPIs (3 cols) -->
			<div class="space-y-4 lg:col-span-3">
				<Card>
					<h3 class="mb-4 text-sm font-medium text-slate-400">{$_('engine.realTimeMetrics')}</h3>

					{#if loading}
						<div class="space-y-6">
							<Skeleton height="3rem" />
							<Skeleton height="3rem" />
							<Skeleton height="3rem" />
						</div>
					{:else}
						<div class="space-y-6">
							<div>
								<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
									<Activity size={14} />
									{$_('engine.powerOutput')}
								</div>
								<div class="font-mono text-2xl font-bold text-white">
									{engineData?.power?.toFixed(0) ?? '---'}
									<span class="text-sm text-slate-500">{$_('common.kw')}</span>
								</div>
							</div>

							<div>
								<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
									<Thermometer size={14} />
									{$_('engine.exhaustTemp')}
								</div>
								<div
									class={cn(
										'font-mono text-2xl font-bold',
										(engineData?.temp ?? 0) > 500 ? 'text-rose-400' : 'text-white'
									)}
								>
									{engineData?.temp?.toFixed(0) ?? '---'}
									<span class="text-sm text-slate-500">{$_('common.celsius')}</span>
								</div>
							</div>

							<div>
								<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
									<Gauge size={14} />
									{$_('engine.efficiency')}
								</div>
								<div class="font-mono text-2xl font-bold text-emerald-400">
									42.5 <span class="text-sm text-emerald-500/50">%</span>
								</div>
							</div>
						</div>
					{/if}
				</Card>

				<Card class="bg-linear-to-br from-slate-900 to-slate-800">
					<h3 class="mb-2 text-sm font-medium text-slate-400">{$_('engine.aiDiagnostic')}</h3>
					{#if (engineData?.temp ?? 0) > 520}
						<div class="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
							<div class="mb-1 flex items-center gap-2 text-sm font-bold text-rose-400">
								<TriangleAlert size={14} />
								{$_('engine.criticalOverheat')}
							</div>
							<p class="text-xs text-rose-200/70">
								{$_('engine.cylinderMisfire')}
							</p>
						</div>
					{:else}
						<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
							<div class="text-sm font-bold text-emerald-400">{$_('engine.optimalOperation')}</div>
							<p class="text-xs text-emerald-200/70">{$_('engine.matchesBaseline')}</p>
						</div>
					{/if}
				</Card>
			</div>

			<!-- Center Column: Chart (6 cols) -->
			<div class="lg:col-span-6">
				<Card class="flex h-[500px] flex-col p-5">
					<h3 class="mb-4 text-sm font-medium text-slate-400">
						{$_('engine.performanceCorrelation')}
					</h3>
					<div bind:this={chartContainer} class="w-full flex-1"></div>
				</Card>
			</div>

			<!-- Right Column: Heatmap (3 cols) -->
			<div class="lg:col-span-3">
				<Card class="h-full">
					<h3 class="mb-6 flex items-center justify-between text-sm font-medium text-slate-400">
						{$_('engine.cylinderTemps')}
						<Badge variant="default">{$_('engine.topView')}</Badge>
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
							{$_('engine.normal')}
						</div>
						<div class="flex items-center gap-2 text-xs text-slate-500">
							<div class="h-3 w-3 rounded bg-amber-500"></div>
							{$_('engine.warning')}
						</div>
						<div class="flex items-center gap-2 text-xs text-slate-500">
							<div class="h-3 w-3 animate-pulse rounded bg-rose-500"></div>
							{$_('engine.critical')}
						</div>
					</div>
				</Card>
			</div>
		</div>
	{:else if activeTab === 'history'}
		<Card>
			<div class="flex h-64 items-center justify-center text-slate-500">
				<div class="text-center">
					<History class="mx-auto mb-2 h-12 w-12 opacity-20" />
					<p>История работы двигателя</p>
					<p class="text-xs text-slate-600">Графики наработки, остановов и событий</p>
				</div>
			</div>
		</Card>
	{:else if activeTab === 'maintenance'}
		<Card>
			<div class="flex h-64 items-center justify-center text-slate-500">
				<div class="text-center">
					<Wrench class="mx-auto mb-2 h-12 w-12 opacity-20" />
					<p>План обслуживания</p>
					<p class="text-xs text-slate-600">История ТО и предстоящие работы</p>
				</div>
			</div>
		</Card>
	{:else if activeTab === 'diagnostics'}
		<Card>
			<div class="flex h-64 items-center justify-center text-slate-500">
				<div class="text-center">
					<Brain class="mx-auto mb-2 h-12 w-12 opacity-20" />
					<p>AI Диагностика</p>
					<p class="text-xs text-slate-600">Прогнозы и рекомендации</p>
				</div>
			</div>
		</Card>
	{/if}
</div>
