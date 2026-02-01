<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		title?: string;
		onclick?: (e: MouseEvent) => void;
		children: import('svelte').Snippet;
	}

	const {
		class: className,
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		href,
		type = 'button',
		title,
		onclick,
		children
	}: Props = $props();

	const variants = {
		primary:
			'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-cyan-500/20',
		secondary:
			'bg-slate-700 hover:bg-slate-600 text-slate-200 hover:-translate-y-0.5 active:translate-y-0',
		ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
		danger:
			'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0',
		outline:
			'border border-slate-700 bg-transparent hover:bg-slate-800 hover:border-slate-600 text-slate-200'
	};

	// Sizes optimized for mobile touch targets (min 44px)
	const sizes = {
		sm: 'px-3 py-2 text-xs gap-1.5 min-h-[36px] sm:min-h-[32px]',
		md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px] sm:min-h-[40px]',
		lg: 'px-6 py-3 text-base gap-2 min-h-[48px]'
	};

	const baseClass = $derived(
		cn(
			'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
			'focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 focus:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
			'active:scale-[0.98]',
			variants[variant],
			sizes[size],
			className
		)
	);
</script>

{#if href}
	<a {href} {title} class={baseClass}>
		{#if loading}
			<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			></span>
		{/if}
		{@render children()}
	</a>
{:else}
	<button {type} disabled={disabled || loading} {onclick} {title} class={baseClass}>
		{#if loading}
			<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			></span>
		{/if}
		{@render children()}
	</button>
{/if}
