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
		ok: 'bg-emerald-500',
		warning: 'bg-amber-500',
		error: 'bg-rose-500'
	};

	const glowColors = {
		ok: 'bg-emerald-400',
		warning: 'bg-amber-400',
		error: 'bg-rose-400'
	};

	const textColors = {
		ok: 'text-emerald-400',
		warning: 'text-amber-400',
		error: 'text-rose-400'
	};

	const sizes = {
		sm: 'h-2 w-2',
		md: 'h-2.5 w-2.5',
		lg: 'h-3 w-3'
	};
</script>

<div class="inline-flex items-center gap-2">
	<span class="relative flex {sizes[size]}">
		{#if pulse && (status === 'warning' || status === 'error')}
			<span
				class={cn(
					'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
					glowColors[status]
				)}
			></span>
		{/if}
		<span
			class={cn(
				'relative inline-flex h-full w-full rounded-full transition-shadow',
				colors[status],
				status === 'ok' && 'shadow-[0_0_8px_rgba(16,185,129,0.6)]',
				status === 'warning' && 'shadow-[0_0_10px_rgba(245,158,11,0.7)]',
				status === 'error' && 'shadow-[0_0_12px_rgba(244,63,94,0.8)]'
			)}
		></span>
	</span>
	{#if showLabel}
		<span class={cn('text-sm font-medium', textColors[status])}>{labelMap[status]}</span>
	{/if}
</div>
