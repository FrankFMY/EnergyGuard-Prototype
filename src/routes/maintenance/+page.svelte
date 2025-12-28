<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	interface Engine {
		id: string;
		model: string;
		status: string;
		total_hours: number;
	}

	let engines: Engine[] = $state([]);
	const SERVICE_INTERVAL = 2000; // hours

	onMount(async () => {
		try {
			const res = await fetch(`${base}/api/status`);
			if (res.ok) {
				const data = await res.json();
				engines = data.engines;
			}
		} catch (e) {
			console.error(e);
		}
	});

	function getNextServiceDate(currentHours: number) {
		const hoursLeft = SERVICE_INTERVAL - (currentHours % SERVICE_INTERVAL);
		const date = new Date();
		date.setHours(date.getHours() + hoursLeft);
		return {
			date: date.toLocaleDateString(),
			daysLeft: Math.floor(hoursLeft / 24),
			hoursLeft
		};
	}
</script>

<div class="mx-auto max-w-4xl">
	<h1 class="mb-6 text-2xl font-bold">Maintenance Forecast</h1>

	<div
		class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
	>
		<table class="w-full text-left text-sm">
			<thead
				class="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50"
			>
				<tr>
					<th class="p-4 font-semibold text-slate-600 dark:text-slate-300">Engine</th>
					<th class="p-4 font-semibold text-slate-600 dark:text-slate-300">Model</th>
					<th class="p-4 font-semibold text-slate-600 dark:text-slate-300">Total Hours</th>
					<th class="p-4 font-semibold text-slate-600 dark:text-slate-300">Next Service</th>
					<th class="p-4 font-semibold text-slate-600 dark:text-slate-300">Time Remaining</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
				{#each engines as engine (engine.id)}
					{@const service = getNextServiceDate(engine.total_hours)}
					<tr class="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
						<td class="p-4 font-medium">{engine.id.toUpperCase()}</td>
						<td class="p-4 text-slate-500">{engine.model}</td>
						<td class="p-4 font-mono">{engine.total_hours.toLocaleString()} h</td>
						<td class="p-4">{service.date}</td>
						<td class="p-4">
							<span
								class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                {service.daysLeft < 7
									? 'bg-red-100 text-red-800'
									: service.daysLeft < 30
										? 'bg-yellow-100 text-yellow-800'
										: 'bg-green-100 text-green-800'}"
							>
								{service.hoursLeft}h ({service.daysLeft} days)
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
