<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { base } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import { currency as currencyState } from '$lib/state/currency.svelte.js';
	import { Card, Badge, Skeleton } from '$lib/components/ui/index.js';
	import { GasQualitySlider } from '$lib/components/dashboard/index.js';
	import { ENGINE_CONSTANTS } from '$lib/types/index.js';
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
	import ShieldCheck from 'lucide-svelte/icons/shield-check';
	import Network from 'lucide-svelte/icons/network';
	import { Button } from '$lib/components/ui/index.js';
	import type { Event as EngineEvent } from '$lib/types/index.js';

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

	// Live Technical Log state
	let rawLog = $state<{ id: string; time: string; msg: string }[]>([]);
	const MAX_LOG_ENTRIES = 8;

	function addLogEntry() {
		const now = new Date();
		const timeStr = now.toLocaleTimeString();
		const p = simulatedData?.power || 1100 + Math.random() * 100;
		const t = simulatedData?.temp || 450 + Math.random() * 20;
		const eff = simulatedData?.efficiency || 42.5;

		// Real Modbus addresses from 16VCN Excel table
		// 3514: Total Power
		// 3001: Cylinder 1 Temp
		// 3111: Water Temp
		const logs = [
			`[MBUS:TCP] REG:3514 (PWR) -> ${p.toFixed(2)} kW`,
			`[MBUS:TCP] REG:3001 (CYL1) -> ${(t + Math.random() * 5).toFixed(1)} °C`,
			`[MBUS:TCP] REG:3111 (H2O) -> ${(85 + Math.random() * 2).toFixed(1)} °C`,
			`[MQTT:PUB] engine/${engineId}/telemetry -> {"p": ${p.toFixed(1)}, "t": ${t.toFixed(1)}, "eff": ${eff.toFixed(1)}}`
		];

		const msg = logs[Math.floor(Math.random() * logs.length)];

		rawLog = [{ id: crypto.randomUUID(), time: timeStr, msg }, ...rawLog].slice(0, MAX_LOG_ENTRIES);
	}

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
	let historyData: ChartDataPoint[] = $state([]);

	// State to track if simulation is active (gas quality < 1.0)
	let simulatedData: { temp: number; power: number; efficiency: number } | null = $state(null);

	// Handler for Gas Quality changes
	function handleSimulationChange(detail: {
		gasQuality: number;
		temperature: number;
		deratedPower: number;
		efficiency: number;
	}) {
		if (detail.gasQuality < 0.99) {
			simulatedData = {
				temp: detail.temperature,
				power: detail.deratedPower,
				efficiency: detail.efficiency
			};
		} else {
			simulatedData = null;
		}
	}

	// Logic for dynamic narrative
	let narrativeValues = $derived.by(() => {
		if (simulatedData) {
			const lossRub = (1200 - simulatedData.power) * 4.5;
			return {
				temp: Math.round(simulatedData.temp - 450),
				power: Math.round(1200 - simulatedData.power),
				loss: currencyState.convert(lossRub).toFixed(0)
			};
		}
		return { temp: 0, power: 0, loss: 0 };
	});

	async function updateData() {
		addLogEntry();
		try {
			const res = await fetch(`${base}/api/history/${engineId}`);
			if (!res.ok) throw new Error('API offline');
			const history: ChartDataPoint[] = await res.json();

			if (history.length > 0) {
				const latest = history[history.length - 1];
				// Use simulated data if active, otherwise real data
				engineData = simulatedData
					? { temp: simulatedData.temp, power: simulatedData.power }
					: latest;
				loading = false;
				renderChart(history);
			} else {
				generateFallbackData();
			}
		} catch {
			generateFallbackData();
		}

		// Always update Heatmap for visual "life"
		cylinderTemps = cylinderTemps.map((t, i) => {
			// Create a stable but slightly different base offset for each cylinder
			// to avoid uniform "all yellow" behavior
			const baseVariance = ((i * 137) % 40) - 20; // -20 to +20 fixed variance
			const jitter = (Math.random() - 0.5) * 8; // Small dynamic jitter

			const targetTemp = engineData?.temp || 480;
			const currentTemp = targetTemp + baseVariance + jitter;

			return Math.max(450, Math.min(750, currentTemp));
		});
	}

	function generateFallbackData() {
		// Create 20 points of fake history if DB is empty
		const fakeHistory: ChartDataPoint[] = [];
		const now = Date.now();
		for (let i = 20; i >= 0; i--) {
			fakeHistory.push({
				time: new Date(now - i * 5000).toISOString(),
				temp: (simulatedData?.temp || 450) + Math.random() * 10,
				power: (simulatedData?.power || 1100) + Math.random() * 50
			});
		}
		engineData = {
			temp: simulatedData?.temp || fakeHistory[fakeHistory.length - 1].temp,
			power: simulatedData?.power || fakeHistory[fakeHistory.length - 1].power
		};
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

			(
				chartInstance as {
					setOption: (opts: unknown, notMerge?: boolean, lazyUpdate?: boolean) => void;
				}
			).setOption(
				{
					animation: true,
					animationDuration: 800,
					animationEasing: 'cubicOut',
					tooltip: {
						trigger: 'axis',
						axisPointer: {
							type: 'cross',
							lineStyle: { color: '#475569' }
						},
						backgroundColor: 'rgba(15, 23, 42, 0.95)',
						borderColor: 'rgba(255,255,255,0.1)',
						textStyle: { color: '#e2e8f0' }
					},
					grid: { left: '3%', right: '4%', bottom: '8%', top: '15%', containLabel: true },
					legend: {
						data: [$_('charts.powerKw'), $_('charts.tempC')],
						textStyle: { color: '#94a3b8' },
						icon: 'roundRect'
					},
					xAxis: {
						type: 'category',
						data: times,
						axisLabel: { color: '#64748b', fontSize: 10 },
						axisLine: { lineStyle: { color: '#334155' } },
						boundaryGap: false
					},
					yAxis: [
						{
							type: 'value',
							name: $_('charts.power'),
							nameTextStyle: { color: '#06b6d4' },
							position: 'left',
							min: (value: { min: number }) => Math.floor(value.min * 0.95),
							max: (value: { max: number }) => Math.ceil(value.max * 1.02),
							axisLabel: { color: '#64748b', fontSize: 10 },
							splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
							axisLine: { show: true, lineStyle: { color: '#06b6d4' } }
						},
						{
							type: 'value',
							name: $_('charts.temp'),
							nameTextStyle: { color: '#f43f5e' },
							position: 'right',
							min: (value: { min: number }) => Math.floor(value.min * 0.98),
							max: (value: { max: number }) => Math.ceil(value.max * 1.02),
							axisLabel: { color: '#64748b', fontSize: 10 },
							splitLine: { show: false },
							axisLine: { show: true, lineStyle: { color: '#f43f5e' } }
						}
					],
					series: [
						{
							name: $_('charts.powerKw'),
							type: 'line',
							data: powers,
							smooth: 0.4,
							symbol: 'none',
							lineStyle: {
								color: '#06b6d4',
								width: 2.5,
								shadowColor: 'rgba(6, 182, 212, 0.3)',
								shadowBlur: 8
							},
							areaStyle: {
								color: {
									type: 'linear',
									x: 0,
									y: 0,
									x2: 0,
									y2: 1,
									colorStops: [
										{ offset: 0, color: 'rgba(6, 182, 212, 0.25)' },
										{ offset: 0.7, color: 'rgba(6, 182, 212, 0.05)' },
										{ offset: 1, color: 'rgba(6, 182, 212, 0)' }
									]
								}
							}
						},
						{
							name: $_('charts.tempC'),
							type: 'line',
							yAxisIndex: 1,
							data: temps,
							smooth: 0.4,
							symbol: 'circle',
							symbolSize: 4,
							showSymbol: false,
							lineStyle: {
								color: '#f43f5e',
								width: 2,
								shadowColor: 'rgba(244, 63, 94, 0.3)',
								shadowBlur: 6
							},
							itemStyle: { color: '#f43f5e' },
							emphasis: {
								focus: 'series',
								itemStyle: {
									borderWidth: 2,
									borderColor: '#fff'
								}
							}
						}
					]
				},
				false,
				true
			); // notMerge: false, lazyUpdate: true for smooth transitions
		}

		// Special case for Cylinder 12 overheating visualization
		if (engineData && engineData.temp > 520) {
			cylinderTemps[11] = 650;
		}
	}

	async function loadHistoryData() {
		if (activeTab !== 'history' || !historyChartContainer) return;

		try {
			const [res, eventsRes] = await Promise.all([
				fetch(`${base}/api/history/${engineId}?range=${historyRange}`),
				fetch(`${base}/api/events/${engineId}?limit=50`)
			]);

			if (!res.ok) return;
			const history: ChartDataPoint[] = await res.json();
			historyData = history;

			let eventMarkers: {
				xAxis: string;
				label: Record<string, unknown>;
				lineStyle: Record<string, unknown>;
				tooltip: Record<string, unknown>;
			}[] = [];

			if (eventsRes.ok) {
				const engineEvents = (await eventsRes.json()) as EngineEvent[];
				const startTime = history.length > 0 ? new Date(history[0].time).getTime() : 0;
				const endTime =
					history.length > 0 ? new Date(history[history.length - 1].time).getTime() : Date.now();

				eventMarkers = engineEvents
					.filter((e: EngineEvent) => {
						const t = new Date(e.time).getTime();
						return t >= startTime && t <= endTime && (e.level === 'warning' || e.level === 'error');
					})
					.map((e: EngineEvent) => ({
						xAxis: new Date(e.time).toLocaleString(),
						label: {
							show: true,
							formatter: e.level === 'error' ? 'CRITICAL' : 'WARNING',
							backgroundColor: e.level === 'error' ? '#f43f5e' : '#f59e0b',
							color: '#fff',
							padding: [2, 4],
							borderRadius: 2,
							fontSize: 10
						},
						lineStyle: {
							color: e.level === 'error' ? '#f43f5e' : '#f59e0b',
							type: 'dashed',
							width: 1,
							opacity: 0.6
						},
						tooltip: {
							formatter: `${new Date(e.time).toLocaleTimeString()}: ${e.message}`
						}
					}));
			}

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
					data: [$_('charts.powerKw'), $_('charts.tempC')],
					textStyle: { color: '#94a3b8' }
				},
				xAxis: { type: 'category', data: times, axisLabel: { color: '#64748b' } },
				yAxis: [
					{
						type: 'value',
						name: $_('charts.power'),
						position: 'left',
						axisLabel: { color: '#64748b' },
						splitLine: { lineStyle: { color: '#1e293b' } }
					},
					{
						type: 'value',
						name: $_('charts.temp'),
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
						name: $_('charts.powerKw'),
						type: 'line',
						data: powers,
						symbol: 'none',
						itemStyle: { color: '#06b6d4' },
						areaStyle: {
							opacity: 0.1,
							color: '#06b6d4'
						},
						markLine: {
							symbol: ['none', 'none'],
							data: eventMarkers,
							label: { show: true }
						}
					},
					{
						name: $_('charts.tempC'),
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
		if (temp > ENGINE_CONSTANTS.CRITICAL_TEMP_THRESHOLD)
			return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse';
		if (temp > ENGINE_CONSTANTS.WARNING_TEMP_THRESHOLD) return 'bg-amber-500';
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
			// Small timeout to allow DOM to render container if needed
			const t = setTimeout(() => {
				loadHistoryData();
			}, 50);
			return () => clearTimeout(t);
		}
	});
</script>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-3 sm:gap-4">
		<div class="flex items-center gap-3 sm:gap-4">
			<a
				href="{base}/"
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-400 active:scale-95"
				aria-label={$_('engine.backToFleetAria')}
			>
				<ArrowLeft class="h-5 w-5" />
			</a>
			<div>
				<h1 class="flex items-center gap-2 text-xl font-bold text-white sm:gap-3 sm:text-2xl">
					<Cpu class="h-5 w-5 text-cyan-400 sm:h-6 sm:w-6" />
					<span class="hidden sm:inline">{$_('engine.details')}:</span>
					<span class="gradient-text-cyan">{engineId?.toUpperCase()}</span>
				</h1>
			</div>
		</div>

		<!-- Tabs - Scrollable on mobile -->
		<div class="relative -mx-4 px-4 sm:mx-0 sm:px-0">
			<div class="scrollbar-hide flex gap-1 overflow-x-auto rounded-lg bg-slate-900/50 p-1">
				{#each tabs as tab, i (tab.id)}
					{@const TabIcon = tab.icon}
					<button
						type="button"
						class={cn(
							'relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 sm:gap-2 sm:px-4',
							activeTab === tab.id
								? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10'
								: 'text-slate-400 hover:bg-white/5 hover:text-white'
						)}
						onclick={() => (activeTab = tab.id)}
						style="animation: fade-in-up 0.3s ease-out {i * 50}ms forwards; opacity: 0;"
					>
						<TabIcon class="h-4 w-4 sm:h-5 sm:w-5" />
						<span class="text-xs whitespace-nowrap sm:text-sm">{$_(`engine.tabs.${tab.id}`)}</span>
						{#if activeTab === tab.id}
							<span
								class="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-cyan-400"
							></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	{#if activeTab === 'overview'}
		<div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
			<!-- Simulation (Full Width for Demo) -->
			<div class="lg:col-span-12">
				<GasQualitySlider
					engineId={$page.params.id}
					nominalPower={1200}
					baseTemp={450}
					onchange={handleSimulationChange}
				/>
			</div>

			<!-- Left Column: KPIs (3 cols) -->
			<div class="space-y-3 sm:space-y-4 lg:col-span-3">
				<Card class="card-hover-lift">
					<div class="mb-3 flex items-center justify-between sm:mb-4">
						<h3 class="text-xs font-medium text-slate-400 sm:text-sm">
							{$_('engine.realTimeMetrics')}
						</h3>
						{#if simulatedData}
							<Badge variant="warning" class="animate-pulse text-xs"
								>{$_('engine.simulation')}</Badge
							>
						{/if}
					</div>

					{#if loading}
						<div class="space-y-4 sm:space-y-6">
							<Skeleton height="3rem" />
							<Skeleton height="3rem" />
							<Skeleton height="3rem" />
						</div>
					{:else}
						<div class="space-y-4 sm:space-y-6">
							<div>
								<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
									<Activity size={14} />
									{$_('engine.powerOutput')}
								</div>
								<div class="font-mono text-xl font-bold text-white tabular-nums sm:text-2xl">
									{engineData?.power?.toFixed(0) ?? '---'}
									<span class="text-xs text-slate-500 sm:text-sm">{$_('common.kw')}</span>
								</div>
							</div>

							<div>
								<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
									<Thermometer size={14} />
									{$_('engine.exhaustTemp')}
								</div>
								<div
									class={cn(
										'font-mono text-xl font-bold tabular-nums transition-colors sm:text-2xl',
										(engineData?.temp ?? 0) > 500 ? 'text-rose-400' : 'text-white'
									)}
								>
									{engineData?.temp?.toFixed(0) ?? '---'}
									<span class="text-xs text-slate-500 sm:text-sm">{$_('common.celsius')}</span>
								</div>
							</div>

							<div>
								<div class="mb-1 flex items-center gap-2 text-xs text-slate-500">
									<Gauge size={14} />
									{$_('engine.efficiency')}
								</div>
								<div
									class={cn(
										'font-mono text-2xl font-bold',
										(simulatedData?.efficiency ?? 42.5) < 38 ? 'text-rose-400' : 'text-emerald-400'
									)}
								>
									{(simulatedData?.efficiency ?? 42.5).toFixed(1)}
									<span class="text-sm opacity-50">%</span>
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
					{:else if (engineData?.temp ?? 0) > 500}
						<div class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
							<div class="mb-1 flex items-center gap-2 text-sm font-bold text-amber-400">
								<TriangleAlert size={16} />
								{$_('engine.riskMedium')}
							</div>
							<p class="text-xs text-amber-200/70">
								{$_('engine.tempAboveNormal')}
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
						{#if simulatedData}
							<div class="text-[10px] font-medium tracking-wider text-rose-400 uppercase">
								{$_('engine.performanceNarrative', {
									values: { ...narrativeValues, symbol: currencyState.info.symbol }
								})}
							</div>
						{:else}
							<div class="text-[10px] font-medium tracking-wider text-cyan-400 uppercase">
								{$_('engine.optimalOperation')}
							</div>
						{/if}
					</div>
					<div bind:this={chartContainer} class="w-full flex-1"></div>
				</Card>
			</div>

			<!-- Right Column: Heatmap & Technical Data (3 cols) -->
			<div class="space-y-3 sm:space-y-4 lg:col-span-3">
				<Card>
					<h3 class="mb-6 flex items-center justify-between text-sm font-medium text-slate-400">
						{$_('engine.cylinderTemps')}
						<Badge variant="default">{$_('engine.topView')}</Badge>
					</h3>

					<div class="grid grid-cols-4 gap-2 xs:gap-3">
						{#each cylinderTemps as temp, i (i)}
							<div
								class="group relative flex aspect-square items-center justify-center rounded-md text-[10px] font-bold text-white/50 transition-all duration-500 xs:text-xs {getCylinderColor(
									temp
								)}"
							>
								{i + 1}

								<!-- Tooltip -->
								<div
									class="absolute bottom-full z-10 mb-2 hidden rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block"
								>
									{$_('engine.cylinderTooltip', { values: { num: i + 1, temp: temp.toFixed(0) } })}
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

				<Card class="border-slate-800/50 bg-slate-900/50">
					<h3 class="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
						{$_('engine.connectivity')}
					</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-xs text-slate-400">
								<Cpu size={14} class="text-cyan-500" />
								Wiren Board 7
							</div>
							<Badge variant="secondary" class="text-[10px]">{$_('engine.online')}</Badge>
						</div>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-xs text-slate-400">
								<Network size={14} class="text-emerald-500" />
								WireGuard VPN
							</div>
							<div class="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
								<div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
								{$_('engine.encrypted')}
							</div>
						</div>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-xs text-slate-400">
								<ShieldCheck size={14} class="text-indigo-400" />
								HZM Protocol
							</div>
							<span class="text-[10px] text-slate-500">Modbus/TCP</span>
						</div>
					</div>
				</Card>

				<Card class="border-slate-800 bg-black/40 font-mono text-[10px]">
					<div class="mb-2 flex items-center justify-between border-b border-white/5 pb-1">
						<span class="tracking-widest text-slate-500 uppercase"
							>{$_('engine.liveProtocolData')}</span
						>
						<div class="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500"></div>
					</div>
					<div class="h-[120px] space-y-1 overflow-hidden">
						{#each rawLog as entry (entry.id)}
							<div class="flex gap-2 transition-opacity duration-500">
								<span class="text-slate-600">[{entry.time}]</span>
								<span class="truncate text-cyan-500/80">{entry.msg}</span>
							</div>
						{/each}
					</div>
				</Card>
			</div>
		</div>
	{:else if activeTab === 'history'}
		<Card>
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h3 class="text-lg font-semibold text-white">{$_('engine.history')}</h3>
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
						{$_('engine.exportCsv')}
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
								<h4 class="font-medium text-white">{$_('engine.minorService')}</h4>
								<Badge variant="warning"
									>{$_('time.hoursLeft', { values: { hours: 124, days: 5 } })}</Badge
								>
							</div>
							<p class="mt-1 text-sm text-slate-400">
								{$_('engine.minorServiceDesc')}
							</p>
							<div class="mt-3 flex gap-4">
								<div class="text-xs text-slate-500">
									<span class="block text-[10px] tracking-wider uppercase"
										>{$_('engine.budget')}</span
									>
									<span class="text-slate-300">{currencyState.format(150000)}</span>
								</div>
								<div class="text-xs text-slate-500">
									<span class="block text-[10px] tracking-wider uppercase"
										>{$_('engine.partsStatus')}</span
									>
									<span class="text-emerald-500">{$_('engine.inStock')}</span>
								</div>
							</div>
						</div>

						<div class="relative">
							<div
								class="absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 border-slate-900 bg-slate-800"
							></div>
							<div class="flex items-center justify-between opacity-50">
								<h4 class="font-medium text-white">{$_('engine.mediumService')}</h4>
								<Badge variant="secondary"
									>{$_('engine.inHours', { values: { hours: 2000 } })}</Badge
								>
							</div>
							<p class="mt-1 text-sm text-slate-500">{$_('engine.mediumServiceDesc')}</p>
						</div>
					</div>
				</div>
			</Card>

			<div class="space-y-6">
				<Card>
					<h3 class="mb-4 text-sm font-medium text-slate-400">{$_('engine.requiredPartsTitle')}</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between rounded bg-white/5 p-2 text-sm">
							<span class="text-slate-300">{$_('maintenance.types.oilFilter')}</span>
							<Badge variant="success">2 {$_('engine.pcs')}</Badge>
						</div>
						<div class="flex items-center justify-between rounded bg-white/5 p-2 text-sm">
							<span class="text-slate-300">{$_('maintenance.types.sparkPlugs')}</span>
							<Badge variant="success">20 {$_('engine.pcs')}</Badge>
						</div>
						<div class="flex items-center justify-between rounded bg-white/5 p-2 text-sm">
							<span class="text-slate-300">{$_('maintenance.types.airFilter')}</span>
							<Badge variant="danger">{$_('engine.toOrder')}</Badge>
						</div>
					</div>
					<Button class="mt-6 w-full" variant="outline">{$_('maintenance.createRequest')}</Button>
				</Card>

				<Card class="border-rose-500/20 bg-rose-500/5">
					<h3 class="mb-2 text-sm font-medium text-rose-400">{$_('maintenance.attention')}</h3>
					<p class="text-xs text-rose-200/60">
						{$_('maintenance.airFilterWarning')}
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
					{$_('engine.rul')}
				</h3>

				<div class="mb-6 rounded-lg bg-slate-800/50 p-4">
					<div class="mb-2 text-sm text-slate-400">{$_('maintenance.nextService')}</div>
					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-bold text-emerald-400 sm:text-4xl">847</span>
						<span class="text-base text-slate-400 sm:text-lg">{$_('units.hours')}</span>
					</div>
					<div class="mt-2 text-xs text-slate-500">
						{$_('engine.riskRange')}: 780 - 920 {$_('units.hours')}
					</div>
				</div>

				<div class="space-y-4">
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">{$_('maintenance.types.sparkPlugs')}</span>
							<span class="font-mono text-emerald-400">92%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full w-[92%] bg-emerald-500"></div>
						</div>
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">{$_('maintenance.types.oilFilter')}</span>
							<span class="font-mono text-emerald-400">85%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full w-[85%] bg-emerald-500"></div>
						</div>
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">{$_('maintenance.types.airFilter')}</span>
							<span class="font-mono text-amber-400">67%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-800">
							<div class="h-full w-[67%] bg-amber-500"></div>
						</div>
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm">
							<span class="text-slate-400">{$_('economics.other')}</span>
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
						<div class="text-xs text-slate-400">{$_('engine.overallRisk')}</div>
					</div>
					<div class="rounded-lg bg-amber-500/10 p-4 text-center">
						<div class="text-3xl font-bold text-amber-400">8.1%</div>
						<div class="text-xs text-slate-400">{$_('engine.overheatRisk')}</div>
					</div>
				</div>

				<div class="space-y-3">
					<h4 class="text-sm font-medium text-slate-300">{$_('engine.riskFactors')}</h4>
					<div class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
						<div class="flex items-start gap-3">
							<div class="mt-0.5 h-2 w-2 rounded-full bg-amber-500"></div>
							<div>
								<div class="text-sm font-medium text-amber-400">
									{$_('engine.elevatedExhaustTemp')}
								</div>
								<div class="text-xs text-slate-400">
									{$_('engine.elevatedExhaustTempDesc')}
								</div>
							</div>
						</div>
					</div>
					<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
						<div class="flex items-start gap-3">
							<div class="mt-0.5 h-2 w-2 rounded-full bg-slate-500"></div>
							<div>
								<div class="text-sm font-medium text-slate-300">{$_('engine.vibrationNormal')}</div>
								<div class="text-xs text-slate-400">
									{$_('engine.vibrationNormalDesc')}
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
						{$_('engine.aiRecommendations')}
					</h3>
					<span class="text-[10px] text-slate-500 italic">
						* {$_('engine.disclaimer')}
					</span>
				</div>

				<div class="grid gap-4 md:grid-cols-3">
					<div class="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
						<Badge variant="info" class="mb-2">{$_('engine.suggested')}</Badge>
						<h4 class="mb-1 font-medium text-white">{$_('engine.scheduleAirFilter')}</h4>
						<p class="text-sm text-slate-400">
							{$_('engine.scheduleAirFilterDesc')}
						</p>
						<div class="mt-3 text-xs text-slate-500">
							{$_('engine.estimatedCost')}: {currencyState.format(15000)}
						</div>
					</div>
					<div class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
						<Badge variant="warning" class="mb-2">{$_('engine.monitor')}</Badge>
						<h4 class="mb-1 font-medium text-white">{$_('engine.cylinder12Temp')}</h4>
						<p class="text-sm text-slate-400">
							{$_('engine.cylinder12TempDesc')}
						</p>
						<div class="mt-3 text-xs text-slate-500">
							{$_('engine.potentialSavings')}: {currencyState.format(50000)}
						</div>
					</div>
					<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
						<Badge variant="success" class="mb-2">{$_('engine.optimal')}</Badge>
						<h4 class="mb-1 font-medium text-white">{$_('engine.fuelEfficiency')}</h4>
						<p class="text-sm text-slate-400">
							{$_('engine.fuelEfficiencyDesc')}
						</p>
						<div class="mt-3 text-xs text-slate-500">
							{$_('engine.savingsThisMonth')}: {currencyState.format(25000)}
						</div>
					</div>
				</div>
			</Card>
		</div>
	{/if}
</div>
