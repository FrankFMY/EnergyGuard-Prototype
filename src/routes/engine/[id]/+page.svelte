<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	// @ts-expect-error echarts type definition issues
	import * as echarts from 'echarts';
	import { base } from '$app/paths';

	let engineId = $state($page.params.id);
	let chartContainer1 = $state<HTMLDivElement>();
	let chartContainer2 = $state<HTMLDivElement>();
	let chart1: echarts.ECharts;
	let chart2: echarts.ECharts;
	let interval: ReturnType<typeof setInterval>;

	async function updateCharts() {
		try {
			const res = await fetch(`${base}/api/history/${engineId}`);
			if (!res.ok) return;
			const data = await res.json();

			const times = data.map((d: { time: string | number | Date }) =>
				new Date(d.time).toLocaleTimeString()
			);
			const temps = data.map((d: { temp: number }) => d.temp);
			const powers = data.map((d: { power: number }) => d.power);

			// Chart 1: Temperature
			chart1.setOption({
				tooltip: { trigger: 'axis' },
				xAxis: { type: 'category', data: times },
				yAxis: { type: 'value', min: 300, max: 600, name: '°C' },
				series: [
					{
						data: temps,
						type: 'line',
						smooth: true,
						name: 'Exhaust Temp',
						lineStyle: { color: '#ef4444' }, // red
						areaStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: 'rgba(239, 68, 68, 0.5)' },
								{ offset: 1, color: 'rgba(239, 68, 68, 0)' }
							])
						}
					}
				]
			});

			// Chart 2: Power
			chart2.setOption({
				tooltip: { trigger: 'axis' },
				xAxis: { type: 'category', data: times },
				yAxis: { type: 'value', min: 0, max: 1500, name: 'kW' },
				series: [
					{
						data: powers,
						type: 'line',
						smooth: true,
						name: 'Active Power',
						lineStyle: { color: '#3b82f6' }, // blue
						areaStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
								{ offset: 1, color: 'rgba(59, 130, 246, 0)' }
							])
						}
					}
				]
			});
		} catch (e) {
			console.error(e);
		}
	}

	onMount(() => {
		if (chartContainer1) chart1 = echarts.init(chartContainer1);
		if (chartContainer2) chart2 = echarts.init(chartContainer2);

		updateCharts();
		interval = setInterval(updateCharts, 1000);

		window.addEventListener('resize', () => {
			chart1?.resize();
			chart2?.resize();
		});
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		chart1?.dispose();
		chart2?.dispose();
	});
</script>

<div class="mb-6 flex items-center gap-4">
	<a href="{base}/" class="rounded-lg p-2 transition hover:bg-slate-200 dark:hover:bg-slate-800">
		← Back
	</a>
	<h1 class="text-2xl font-bold">Engine Details: {engineId?.toUpperCase()}</h1>
</div>

<div class="grid grid-cols-1 gap-6">
	<div
		class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
	>
		<h3 class="mb-4 text-lg font-bold text-red-600">Exhaust Gas Temperature</h3>
		<div bind:this={chartContainer1} class="h-[300px] w-full"></div>
	</div>

	<div
		class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
	>
		<h3 class="mb-4 text-lg font-bold text-blue-600">Active Power</h3>
		<div bind:this={chartContainer2} class="h-[300px] w-full"></div>
	</div>
</div>
