<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		variant?: 'default' | 'glass' | 'danger' | 'success';
		hover?: boolean;
		compact?: boolean;
		onclick?: (e: MouseEvent) => void;
		children: import('svelte').Snippet;
	}

	const {
		class: className,
		variant = 'glass',
		hover = false,
		compact = false,
		onclick,
		children
	}: Props = $props();

	const variants = {
		default: 'bg-slate-900 border-slate-800',
		glass: 'glass-card',
		danger: 'glass-card border-rose-500/20 bg-rose-500/5',
		success: 'glass-card border-emerald-500/20 bg-emerald-500/5'
	};

	const basePadding = $derived(compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6');
</script>

{#if onclick}
	<button
		type="button"
		class={cn(
			'w-full rounded-xl border text-left transition-all duration-200',
			basePadding,
			variants[variant],
			hover && 'hover:-translate-y-1 hover:border-white/10 hover:shadow-lg active:scale-[0.98]',
			'cursor-pointer',
			className
		)}
		{onclick}
	>
		{@render children()}
	</button>
{:else}
	<div
		class={cn(
			'rounded-xl border transition-all duration-200',
			basePadding,
			variants[variant],
			hover && 'hover:-translate-y-1 hover:border-white/10 hover:shadow-lg',
			className
		)}
	>
		{@render children()}
	</div>
{/if}
