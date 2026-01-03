<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { base } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import { Card, Badge, Skeleton } from '$lib/components/ui/index.js';
	import { GasQualitySlider } from '$lib/components/dashboard/index.js';
	import Thermometer from 'lucide-svelte/icons/thermometer';
	import Activity from 'lucide-svelte/icons/activity';
	import Gauge from 'lucide-svelte/icons/gauge';
	import Cpu from 'lucide-svelte/icons/cpu';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import History from 'lucide-svelte/icons/history';
	import Wrench from 'lucide-svelte/icons/wrench';
	import Brain from 'lucide-svelte/icons/brain';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Download from 'lucide-svelte/icons/download';
	import { Button } from '$lib/components/ui/index.js';

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
	let engineData: EngineData | null = $state({ temp: 450, power: 1120 });
	let loading = $state(false);

	// Mock Cylinder Temps (4x5 Grid)
	let cylinderTemps = $state(
		Array(20)
			.fill(480)
			.map((t) => t + Math.random() * 20)
	);

	// History Tab specific state
	let historyChartContainer = $state<HTMLDivElement>();
	let historyChartInstance: unknown;
	let historyRange = $state('1h');
	let _historyLoading = $state(false);
	let historyData: ChartDataPoint[] = $state([]);

	async function updateData() {
		try {
			const res = await fetch(`${base}/api/history/${engineId}`);
			if (!res.ok) throw new Error('API offline');
			const history: ChartDataPoint[] = await res.json();

			if (history.length > 0) {
				const latest = history[history.length - 1];
				engineData = latest;
				loading = false;
				renderChart(history);
			} else {
				generateFallbackData();
			}
		} catch (e) {
			generateFallbackData();
		}

		// Always update Heatmap for visual "life"
		cylinderTemps = cylinderTemps.map((t) => {
			const jitter = (Math.random() - 0.5) * 5;
			return Math.max(450, Math.min(650, t + jitter));
		});
	}

	function generateFallbackData() {
		// Create 20 points of fake history if DB is empty
		const fakeHistory: ChartDataPoint[] = [];
		const now = Date.now();
		for (let i = 20; i >= 0; i--) {
			fakeHistory.push({
				time: new Date(now - i * 5000).toISOString(),
				temp: 450 + Math.random() * 30,
				power: 1100 + Math.random() * 100
			});
		}
		engineData = fakeHistory[fakeHistory.length - 1];
		loading = false;
		renderChart(fakeHistory);
	}

	function renderChart(history: ChartDataPoint[]) {
		if (
			chartInstance &&
			typeof chartInstance === 'object' &&
			'setOption' in chartInstance &&
			activeTab === 'overview'
		) {
			const times = history.map((d) => new Date(d.time).toLocaleTimeString());
			const temps = history.map((d) => d.temp);
			const powers = history.map((d) => d.power);

			(chartInstance as { setOption: (opts: unknown) => void }).setOption({
				tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
				grid: { left: '5%', right: '5%', bottom: '10%', top: '15%' },
				legend: {
					data: ['Power (kW)', 'Exhaust Temp (°C)'],
					textStyle: { color: '#94a3b8' }
				},
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

		// Special case for Cylinder 12 overheating visualization
		if (engineData && engineData.temp > 520) {
			cylinderTemps[11] = 650;
		}
	}

	async function loadHistoryData() {
		if (activeTab !== 'history' || !historyChartContainer) return;

		_historyLoading = true;
		try {
			const res = await fetch(`${base}/api/history/${engineId}?range=${historyRange}`);
			if (!res.ok) return;
			const history: ChartDataPoint[] = await res.json();
			historyData = history;

			if (!historyChartInstance) {
				const echarts = await import('echarts');
				historyChartInstance = echarts.init(historyChartContainer);
			}

			const times = history.map((d) => new Date(d.time).toLocaleString());
			const temps = history.map((d) => d.temp);
			const powers = history.map((d) => d.power);

			(historyChartInstance as { setOption: (opts: unknown) => void }).setOption({
				tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
				grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
				legend: {
					data: ['Power (kW)', 'Exhaust Temp (°C)'],
					textStyle: { color: '#94a3b8' }
				},
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
				dataZoom: [
					{
						type: 'inside',
						start: 0,
						end: 100
					},
					{
						start: 0,
						end: 100
					}
				],
				series: [
					{
						name: 'Power (kW)',
						type: 'line',
						data: powers,
						symbol: 'none',
						itemStyle: { color: '#06b6d4' },
						areaStyle: {
							opacity: 0.1,
							color: '#06b6d4'
						}
					},
					{
						name: 'Exhaust Temp (°C)',
						type: 'line',
						yAxisIndex: 1,
						data: temps,
						symbol: 'none',
						itemStyle: { color: '#f43f5e' }
					}
				]
			});
		} catch (e) {
			console.error(e);
		} finally {
			_historyLoading = false;
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
		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (chartInstance && typeof chartInstance === 'object' && 'dispose' in chartInstance) {
			(chartInstance as { dispose: () => void }).dispose();
		}
		if (
			historyChartInstance &&
			typeof historyChartInstance === 'object' &&
			'dispose' in historyChartInstance
		) {
			(historyChartInstance as { dispose: () => void }).dispose();
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', handleResize);
		}
	});

	function handleResize() {
		if (chartInstance && typeof chartInstance === 'object' && 'resize' in chartInstance) {
			(chartInstance as { resize: () => void }).resize();
		}
		if (
			historyChartInstance &&
			typeof historyChartInstance === 'object' &&
			'resize' in historyChartInstance
		) {
			(historyChartInstance as { resize: () => void }).resize();
		}
	}

	function getCylinderColor(temp: number) {
		if (temp > 600) return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse';
		if (temp > 500) return 'bg-amber-500';
		return 'bg-emerald-500/20';
	}

	function exportToCSV() {
		if (historyData.length === 0) return;

		const headers = ['Time', 'Power (kW)', 'Exhaust Temp (°C)'];
		const rows = historyData.map((d) => [
			new Date(d.time).toISOString(),
			d.power.toString(),
			d.temp.toString()
		]);

		const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `${engineId}_telemetry_${historyRange}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Watch for tab and range changes to load history
	$effect(() => {
		if (activeTab === 'history') {
			// Small timeout to allow DOM to render container
			setTimeout(() => {
				loadHistoryData();
			}, 50);
		}
	});

	$effect(() => {
		if (activeTab === 'history') {
			loadHistoryData();
		}
	});
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
			{#each tabs as tab (tab.id)}
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
					<TabIcon class="h-5 w-5 md:h-4 md:w-4" />
					<span class="hidden md:inline">{$_(`engine.tabs.${tab.id}`)}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if activeTab === 'overview'}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<!-- Simulation (Full Width for Demo) -->
			<div class="lg:col-span-12">
				<GasQualitySlider nominalPower={1200} baseTemp={450} />
			</div>

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
						<div class="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
							<div class="mb-1 flex items-center gap-2 text-sm font-bold text-rose-400">
								<TriangleAlert size={16} />
								{$_('engine.riskHigh')}
							</div>
							<p class="text-xs text-rose-200/70">
								{$_('engine.cylinderMisfire')}
							</p>
						</div>
					{:else}
						<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
							<div class="flex items-center gap-2 text-sm font-bold text-emerald-400">
								<Activity size={16} />
								{$_('engine.riskLow')}
							</div>
							<p class="text-xs text-emerald-200/70">{$_('engine.matchesBaseline')}</p>
						</div>
					{/if}
				</Card>
			</div>

			<!-- Center Column: Chart (6 cols) -->
			<div class="lg:col-span-6">
				<Card class="flex h-[500px] flex-col p-5">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-sm font-medium text-slate-400">
							{$_('engine.performanceCorrelation')}
						</h3>
						<div class="text-[10px] font-medium tracking-wider text-cyan-400 uppercase">
							{$_('engine.performanceNarrative', { values: { temp: 12, power: 85, loss: 1240 } })}
						</div>
					</div>
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
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h3 class="text-lg font-semibold text-white">History</h3>
				<div class="flex items-center gap-4">
					<div class="flex gap-2">
						{#each ['1h', '24h', '7d'] as r (r)}
							<button
								type="button"
								class={cn(
									'rounded px-3 py-1 text-xs font-medium transition',
									historyRange === r
										? 'bg-cyan-500 text-white'
										: 'bg-slate-800 text-slate-400 hover:text-white'
								)}
								onclick={() => {
									historyRange = r;
									loadHistoryData();
								}}
							>
								{r}
							</button>
						{/each}
					</div>
					<Button
						variant="outline"
						size="sm"
						onclick={exportToCSV}
						disabled={historyData.length === 0}
						class="gap-2"
					>
						<Download class="h-4 w-4" />
						Export CSV
					</Button>
				</div>
			</div>
			<div class="h-[500px] w-full" bind:this={historyChartContainer}></div>
		</Card>
	{:else if activeTab === 'maintenance'}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<Card class="lg:col-span-2">
				<h3 class="mb-6 text-lg font-semibold text-white">{$_('engine.maintenancePlan')}</h3>
				<div class="space-y-6">
					<div
						class="relative pl-6 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:bg-slate-800"
					>
						<div class="relative mb-6">
							<div
								class="absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 border-slate-900 bg-cyan-500"
							></div>
							<div class="flex items-center justify-between">
								<h4 class="font-medium text-white">ТО-1 (Малое обслуживание)</h4>
								<Badge variant="warning"
									>{$_('time.hoursLeft', { values: { hours: 124, days: 5 } })}</Badge
								>
							</div>
							<p class="mt-1 text-sm text-slate-400">
								Замена масла, фильтров, проверка свечей зажигания.
							</p>
							<div class="mt-3 flex gap-4">
								<div class="text-xs text-slate-500">
									<span class="block text-[10px] tracking-wider uppercase">Бюджет</span>
									<span class="text-slate-300">150 000 ₽</span>
								</div>
								<div class="text-xs text-slate-500">
									<span class="block text-[10px] tracking-wider uppercase">ЗИП</span>
									<span class="text-emerald-500">В наличии</span>
								</div>
							</div>
						</div>

						<div class="relative">
							<div
								class="absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 border-slate-900 bg-slate-800"
							></div>
							<div class="flex items-center justify-between opacity-50">
								<h4 class="font-medium text-white">ТО-2 (Среднее обслуживание)</h4>
								<Badge variant="outline">через 2000 ч</Badge>
							</div>
							<p class="mt-1 text-sm text-slate-500">Полная диагностика, регулировка клапанов.</p>
						</div>
					</div>
				</div>
			</Card>

			<div class="space-y-6">
				<Card>
					<h3 class="mb-4 text-sm font-medium text-slate-400">Необходимые ЗИП</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between rounded bg-white/5 p-2 text-sm">
							<span class="text-slate-300">Масляный фильтр</span>
							<Badge variant="success">2 шт</Badge>
						</div>
						<div class="flex items-center justify-between rounded bg-white/5 p-2 text-sm">
							<span class="text-slate-300">Свечи зажигания</span>
							<Badge variant="success">20 шт</Badge>
						</div>
						<div class="flex items-center justify-between rounded bg-white/5 p-2 text-sm">
							<span class="text-slate-300">Воздушный фильтр</span>
							<Badge variant="danger">Заказать</Badge>
						</div>
					</div>
					<Button class="mt-6 w-full" variant="outline">Оформить заявку</Button>
				</Card>

				<Card class="border-rose-500/20 bg-rose-500/5">
					<h3 class="mb-2 text-sm font-medium text-rose-400">Внимание</h3>
					<p class="text-xs text-rose-200/60">
						Обнаружен повышенный износ воздушного фильтра. Рекомендуется сократить интервал замены
						до 100 часов.
					</p>
				</Card>
			</div>
		</div>
	{:else if activeTab === 'diagnostics'}
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- RUL Prediction -->
			<Card>
				<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
					<Brain class="h-5 w-5 text-cyan-400" />
					Remaining Useful Life (RUL)
				</h3>

				<div class="mb-6 rounded-lg bg-slate-800/50 p-4">
					<div class="mb-2 text-sm text-slate-400">{$_('maintenance.nextService')}</div>
					<div class="flex items-baseline gap-2">
						<span class="text-4xl font-bold text-emerald-400">847</span>
						<span class="text-lg text-slate-400">{$_('units.hours')}</span>
					</div>
					<div class="mt-2 text-xs text-slate-500">
						{$_('engine.riskRange')}: 780 - 920 {$_('units.hours')}
					</div>
				</div>

				<div class="space-y-4">
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">Spark Plugs</span>
							<span class="font-mono text-emerald-400">92%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full w-[92%] bg-emerald-500"></div>
						</div>
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">Oil Quality</span>
							<span class="font-mono text-emerald-400">85%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full w-[85%] bg-emerald-500"></div>
						</div>
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">Air Filter</span>
							<span class="font-mono text-amber-400">67%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full w-[67%] bg-amber-500"></div>
						</div>
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">Coolant System</span>
							<span class="font-mono text-emerald-400">78%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full w-[78%] bg-emerald-500"></div>
						</div>
					</div>
				</div>
			</Card>

			<!-- Failure Probability -->
			<Card>
				<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
					<TriangleAlert class="h-5 w-5 text-amber-400" />
					{$_('engine.aiRiskAssessment')}
				</h3>

				<div class="mb-6 grid grid-cols-2 gap-4">
					<div class="rounded-lg bg-emerald-500/10 p-4 text-center">
						<div class="text-3xl font-bold text-emerald-400">2.3%</div>
						<div class="text-xs text-slate-400">Overall Risk</div>
					</div>
					<div class="rounded-lg bg-amber-500/10 p-4 text-center">
						<div class="text-3xl font-bold text-amber-400">8.1%</div>
						<div class="text-xs text-slate-400">Overheating Risk</div>
					</div>
				</div>

				<div class="space-y-3">
					<h4 class="text-sm font-medium text-slate-300">Risk Factors</h4>
					<div class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
						<div class="flex items-start gap-3">
							<div class="mt-0.5 h-2 w-2 rounded-full bg-amber-500"></div>
							<div>
								<div class="text-sm font-medium text-amber-400">Elevated Exhaust Temperature</div>
								<div class="text-xs text-slate-400">
									Average temp 12°C above baseline. Monitor cylinder 12.
								</div>
							</div>
						</div>
					</div>
					<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
						<div class="flex items-start gap-3">
							<div class="mt-0.5 h-2 w-2 rounded-full bg-slate-500"></div>
							<div>
								<div class="text-sm font-medium text-slate-300">Vibration Pattern Normal</div>
								<div class="text-xs text-slate-400">
									No anomalies detected in vibration spectrum analysis.
								</div>
							</div>
						</div>
					</div>
				</div>
			</Card>

			<!-- AI Recommendations -->
			<Card class="lg:col-span-2">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="flex items-center gap-2 text-lg font-semibold text-white">
						<Brain class="h-5 w-5 text-cyan-400" />
						AI Recommendations
					</h3>
					<span class="text-[10px] text-slate-500 italic">
						* {$_('engine.disclaimer')}
					</span>
				</div>

				<div class="grid gap-4 md:grid-cols-3">
					<div class="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
						<Badge variant="info" class="mb-2">Suggested</Badge>
						<h4 class="mb-1 font-medium text-white">Schedule Air Filter Check</h4>
						<p class="text-sm text-slate-400">
							Air filter efficiency dropping. Recommend inspection within 200 operating hours.
						</p>
						<div class="mt-3 text-xs text-slate-500">Estimated cost: 15,000 ₽</div>
					</div>
					<div class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
						<Badge variant="warning" class="mb-2">Monitor</Badge>
						<h4 class="mb-1 font-medium text-white">Cylinder 12 Temperature</h4>
						<p class="text-sm text-slate-400">
							Consistently running 5-10°C above other cylinders. May indicate injector issue.
						</p>
						<div class="mt-3 text-xs text-slate-500">Potential savings: 50,000 ₽</div>
					</div>
					<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
						<Badge variant="success" class="mb-2">Optimal</Badge>
						<h4 class="mb-1 font-medium text-white">Fuel Efficiency</h4>
						<p class="text-sm text-slate-400">
							Engine operating at 98.5% of optimal fuel efficiency. No action required.
						</p>
						<div class="mt-3 text-xs text-slate-500">Savings this month: 25,000 ₽</div>
					</div>
				</div>
			</Card>
		</div>
	{/if}
</div>
