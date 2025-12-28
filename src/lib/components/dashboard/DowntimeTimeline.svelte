<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card, Badge } from '$lib/components/ui/index.js';
	import Clock from 'lucide-svelte/icons/clock';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import CheckCircle from 'lucide-svelte/icons/check-circle-2';

	interface Downtime {
		id: string;
		engine_id: string;
		start_time: Date;
		end_time: Date | null;
		reason: string | null;
		loss_rub: number | null;
	}

	interface Props {
		class?: string;
	}

	const { class: className = '' }: Props = $props();

	// Mock data for demo
	const downtimes: Downtime[] = [
		{
			id: '1',
			engine_id: 'gpu-2',
			start_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 1 * 60 * 60 * 1000),
			reason: 'Превышение температуры выхлопа',
			loss_rub: 24000
		},
		{
			id: '2',
			engine_id: 'gpu-4',
			start_time: new Date(Date.now() - 8 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 6 * 60 * 60 * 1000),
			reason: 'Плановое ТО',
			loss_rub: 48000
		},
		{
			id: '3',
			engine_id: 'gpu-1',
			start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
			end_time: new Date(Date.now() - 22 * 60 * 60 * 1000),
			reason: 'Низкое давление газа',
			loss_rub: 36000
		}
	];

	const totalLosses = downtimes.reduce((sum, d) => sum + (d.loss_rub || 0), 0);

	function formatDuration(start: Date, end: Date | null): string {
		const endTime = end || new Date();
		const diffMs = endTime.getTime() - start.getTime();
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		return `${hours}ч ${minutes}м`;
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
				{totalLosses.toLocaleString()} ₽
			</div>
		</div>
	</div>

	<div class="space-y-3">
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
								<Badge variant="danger" pulse>В процессе</Badge>
							{:else}
								<Badge variant="success">Завершен</Badge>
							{/if}
						</div>
						<span class="font-mono text-sm text-rose-400">
							-{(dt.loss_rub || 0).toLocaleString()} ₽
						</span>
					</div>

					<p class="mb-2 text-sm text-slate-300">{dt.reason || 'Причина не указана'}</p>

					<div class="flex items-center gap-4 text-xs text-slate-500">
						<span>{dt.start_time.toLocaleTimeString()}</span>
						<span>→</span>
						<span>{dt.end_time?.toLocaleTimeString() || 'сейчас'}</span>
						<span class="text-slate-400">({formatDuration(dt.start_time, dt.end_time)})</span>
					</div>
				</div>
			</div>
		{/each}

		{#if downtimes.length === 0}
			<div class="py-8 text-center text-slate-500">
				<CheckCircle class="mx-auto mb-2 h-8 w-8 text-emerald-400/50" />
				<p>Нет простоев за период</p>
			</div>
		{/if}
	</div>
</Card>
