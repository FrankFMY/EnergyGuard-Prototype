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
		onclick,
		children
	}: Props = $props();

	const variants = {
		primary: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20',
		secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
		ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
		danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20',
		outline: 'border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200'
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-xs',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	const baseClass = $derived(
		cn(
			'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all',
			'focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 focus:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50',
			variants[variant],
			sizes[size],
			className
		)
	);
</script>

{#if href}
	<a {href} class={baseClass}>
		{#if loading}
			<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			></span>
		{/if}
		{@render children()}
	</a>
{:else}
	<button {type} {disabled} {onclick} class={baseClass}>
		{#if loading}
			<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			></span>
		{/if}
		{@render children()}
	</button>
{/if}
