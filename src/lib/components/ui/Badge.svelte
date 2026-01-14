<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
		size?: 'sm' | 'md' | 'lg';
		pulse?: boolean;
		children: import('svelte').Snippet;
	}

	const {
		class: className,
		variant = 'default',
		size = 'md',
		pulse = false,
		children
	}: Props = $props();

	const variants = {
		default: 'bg-slate-700 text-slate-200',
		secondary: 'bg-slate-800 text-slate-400 border-slate-700',
		success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
		warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
		danger: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
		info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
	};

	const sizes = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-1 text-xs',
		lg: 'px-3 py-1.5 text-sm'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 rounded-full border font-medium',
		variants[variant],
		sizes[size],
		pulse && 'animate-pulse',
		className
	)}
>
	{@render children()}
</span>
