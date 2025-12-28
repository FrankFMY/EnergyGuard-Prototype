<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { EngineStatus } from '$lib/types/index.js';

	interface Props {
		status: EngineStatus;
		size?: 'sm' | 'md' | 'lg';
		pulse?: boolean;
		showLabel?: boolean;
		labelMap?: Record<EngineStatus, string>;
	}

	const {
		status,
		size = 'md',
		pulse = true,
		showLabel = false,
		labelMap = { ok: 'OK', warning: 'Warning', error: 'Error' }
	}: Props = $props();

	const colors = {
		ok: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
		warning: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
		error: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
	};

	const sizes = {
		sm: 'h-2 w-2',
		md: 'h-3 w-3',
		lg: 'h-4 w-4'
	};
</script>

<div class="inline-flex items-center gap-2">
	<div class={cn('rounded-full', colors[status], sizes[size], pulse && 'animate-pulse')}></div>
	{#if showLabel}
		<span class="text-sm text-slate-400">{labelMap[status]}</span>
	{/if}
</div>
