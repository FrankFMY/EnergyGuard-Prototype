<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { _ } from 'svelte-i18n';
	import { Card, Badge } from '$lib/components/ui/index.js';
	import { currency as currencyState } from '$lib/state/currency.svelte.js';
	import Clock from 'lucide-svelte/icons/clock';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import CheckCircle from 'lucide-svelte/icons/check-circle-2';

	interface Downtime {
		id: string;
		engine_id: string;
		start_time: string | Date;
		end_time: string | Date | null;
		reason: string | null;
		loss_rub: number | null;
	}

	interface Props {
		class?: string;
	}

	const { class: className = '' }: Props = $props();

	// State for data
	let downtimes = $state<Downtime[]>([]);
	let loading = $state(true);

	// Mock data for fallback
	const mockDowntimes = $derived.by(() => [
		{
			id: '1',
			engine_id: 'gpu-2',
			start_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 1 * 60 * 60 * 1000),
			reason: $_('downtime.reasons.overheat'),
			loss_rub: 24000
		},
		{
			id: '2',
			engine_id: 'gpu-4',
			start_time: new Date(Date.now() - 8 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 6 * 60 * 60 * 1000),
			reason: $_('downtime.reasons.scheduled'),
			loss_rub: 48000
		},
		{
			id: '3',
			engine_id: 'gpu-1',
			start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 22 * 60 * 60 * 1000),
			reason: $_('downtime.reasons.lowGas'),
			loss_rub: 36000
		}
	]);

	async function fetchDowntimes() {
		try {
			const res = await fetch(`${base}/api/downtimes`);
			if (res.ok) {
				const data = await res.json();
				if (data.length > 0) {
					downtimes = data;
				} else {
					downtimes = mockDowntimes;
				}
			} else {
				downtimes = mockDowntimes;
			}
		} catch (e) {
			console.error('Failed to fetch downtimes', e);
			downtimes = mockDowntimes;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchDowntimes();
	});

	const totalLosses = $derived(downtimes.reduce((sum, d) => sum + (d.loss_rub || 0), 0));

	function formatDuration(start: string | Date, end: string | Date | null): string {
		const startTime = typeof start === 'string' ? new Date(start) : start;
		const endTime = end ? (typeof end === 'string' ? new Date(end) : end) : new Date();
		const diffMs = endTime.getTime() - startTime.getTime();
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		const hLabel = $_('units.hours');
		const mLabel = 'min'; // or add to units

		if (minutes === 0) {
			return `${hours} ${hLabel}`;
		}
		return `${hours} ${hLabel} ${minutes} ${mLabel}`;
	}

	function formatTime(date: string | Date) {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleTimeString();
	}
</script>

<Card class={className}>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="flex items-center gap-2 text-lg font-semibold text-white">
			<Clock class="h-5 w-5 text-amber-400" />
			{$_('downtime.title')}
		</h3>
		<div class="text-right">
			<div class="text-xs text-slate-500">{$_('downtime.totalLosses')}</div>
			<div class="font-mono font-bold text-rose-400">
				{currencyState.format(totalLosses)}
			</div>
		</div>
	</div>

	<div class="space-y-3">
		{#if loading}
			<div class="py-10 text-center text-slate-500">{$_('downtime.loading')}</div>
		{:else}
			{#each downtimes as dt (dt.id)}
				<div
					class="relative flex gap-4 rounded-lg border border-white/5 bg-white/5 p-3 transition hover:bg-white/10"
				>
					<!-- Timeline line -->
					<div class="flex flex-col items-center">
						{#if dt.end_time}
							<CheckCircle class="h-5 w-5 text-emerald-400" />
						{:else}
							<AlertCircle class="h-5 w-5 animate-pulse text-rose-400" />
						{/if}
						<div class="mt-2 h-full w-px bg-slate-700"></div>
					</div>

					<div class="flex-1">
						<div class="mb-1 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="font-bold text-cyan-400">{dt.engine_id.toUpperCase()}</span>
								{#if !dt.end_time}
									<Badge variant="danger" pulse>{$_('downtime.inProgress')}</Badge>
								{:else}
									<Badge variant="success">{$_('downtime.completed')}</Badge>
								{/if}
							</div>
							<span class="font-mono text-sm text-rose-400">
								-{currencyState.format(dt.loss_rub || 0)}
							</span>
						</div>

						<p class="mb-2 text-sm text-slate-300">{dt.reason || $_('downtime.noReason')}</p>

						<div class="flex items-center gap-4 text-xs text-slate-500">
							<span>{formatTime(dt.start_time)}</span>
							<span>→</span>
							<span>{dt.end_time ? formatTime(dt.end_time) : $_('downtime.now')}</span>
							<span class="text-slate-400">({formatDuration(dt.start_time, dt.end_time)})</span>
						</div>
					</div>
				</div>
			{/each}

			{#if downtimes.length === 0}
				<div class="py-8 text-center text-slate-500">
					<CheckCircle class="mx-auto mb-2 h-8 w-8 text-emerald-400/50" />
					<p>{$_('downtime.noDowntime')}</p>
				</div>
			{/if}
		{/if}
	</div>
</Card>
