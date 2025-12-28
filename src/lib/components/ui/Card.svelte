<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		variant?: 'default' | 'glass' | 'danger' | 'success';
		hover?: boolean;
		onclick?: (e: MouseEvent) => void;
		children: import('svelte').Snippet;
	}

	const { class: className, variant = 'glass', hover = false, onclick, children }: Props = $props();

	const variants = {
		default: 'bg-slate-900 border-slate-800',
		glass: 'glass-card',
		danger: 'glass-card border-rose-500/20',
		success: 'glass-card border-emerald-500/20'
	};
</script>

<div
	class={cn(
		'rounded-xl border p-6',
		variants[variant],
		hover && 'transition-all hover:-translate-y-1 hover:bg-white/5',
		onclick && 'cursor-pointer',
		className
	)}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.(e as unknown as MouseEvent)}
>
	{@render children()}
</div>
