<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { ComponentType } from 'svelte';

	interface Props {
		class?: string;
		title: string;
		value: string | number;
		unit?: string;
		subtitle?: string;
		trend?: 'up' | 'down' | 'neutral';
		trendValue?: string;
		icon?: ComponentType;
		variant?: 'default' | 'danger' | 'success';
	}

	const {
		class: className,
		title,
		value,
		unit,
		subtitle,
		trend,
		trendValue,
		icon: Icon,
		variant = 'default'
	}: Props = $props();

	const trendColors = {
		up: 'text-emerald-400',
		down: 'text-rose-400',
		neutral: 'text-slate-400'
	};

	const variantStyles = {
		default: '',
		danger: 'border-rose-500/20',
		success: 'border-emerald-500/20'
	};

	const textColors = {
		default: 'text-white',
		danger: 'text-rose-400',
		success: 'text-emerald-400'
	};
</script>

<div
	class={cn(
		'glass-card group relative overflow-hidden rounded-xl p-6',
		variantStyles[variant],
		className
	)}
>
	{#if Icon}
		<div
			class={cn(
				'absolute -top-4 -right-4 opacity-10 transition-transform group-hover:scale-110',
				variant === 'danger' && 'text-rose-500'
			)}
		>
			<Icon size={100} />
		</div>
	{/if}

	<h3 class={cn('text-sm font-medium', variant === 'danger' ? 'text-rose-200' : 'text-slate-400')}>
		{title}
	</h3>

	<div class="mt-2 flex items-baseline gap-2">
		<span class={cn('text-4xl font-bold tracking-tight', textColors[variant])}>
			{typeof value === 'number' ? value.toLocaleString() : value}
		</span>
		{#if unit}
			<span class="text-sm font-medium text-slate-500">{unit}</span>
		{/if}
	</div>

	{#if subtitle || trendValue}
		<div class="mt-4 flex items-center gap-2 text-xs">
			{#if trend && trendValue}
				<span class={cn('flex items-center gap-1', trendColors[trend])}>
					{#if trend === 'up'}↑{:else if trend === 'down'}↓{/if}
					{trendValue}
				</span>
			{/if}
			{#if subtitle}
				<span class={cn(variant === 'danger' ? 'text-rose-300/60' : 'text-slate-500')}>
					{subtitle}
				</span>
			{/if}
		</div>
	{/if}
</div>
