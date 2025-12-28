<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		value: number;
		max?: number;
		showLabel?: boolean;
		variant?: 'default' | 'gradient' | 'success' | 'warning' | 'danger';
		size?: 'sm' | 'md' | 'lg';
	}

	const {
		class: className,
		value,
		max = 100,
		showLabel = false,
		variant = 'gradient',
		size = 'md'
	}: Props = $props();

	const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));

	const variants = {
		default: 'bg-slate-500',
		gradient: 'bg-linear-to-r from-cyan-500 to-blue-500',
		success: 'bg-emerald-500',
		warning: 'bg-amber-500',
		danger: 'bg-rose-500'
	};

	const sizes = {
		sm: 'h-1',
		md: 'h-1.5',
		lg: 'h-2'
	};
</script>

<div class={cn('w-full', className)}>
	{#if showLabel}
		<div class="mb-1 flex justify-between text-xs text-slate-400">
			<span>{value.toFixed(1)}</span>
			<span>{percentage.toFixed(0)}%</span>
		</div>
	{/if}
	<div class={cn('w-full overflow-hidden rounded-full bg-slate-800', sizes[size])}>
		<div
			class={cn('transition-all duration-1000', variants[variant], sizes[size])}
			style="width: {percentage}%"
		></div>
	</div>
</div>
