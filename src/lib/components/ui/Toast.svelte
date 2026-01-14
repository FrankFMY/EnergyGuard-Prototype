<script lang="ts">
	import { cn } from '$lib/utils.js';
	import X from 'lucide-svelte/icons/x';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import Info from 'lucide-svelte/icons/info';

	interface Props {
		class?: string;
		variant?: 'info' | 'success' | 'warning' | 'error';
		title: string;
		message?: string;
		dismissible?: boolean;
		onclose?: () => void;
	}

	const {
		class: className,
		variant = 'info',
		title,
		message,
		dismissible = true,
		onclose
	}: Props = $props();

	const config = $derived(
		{
			info: {
				bg: 'bg-cyan-500/10 border-cyan-500/30',
				text: 'text-cyan-400',
				Icon: Info
			},
			success: {
				bg: 'bg-emerald-500/10 border-emerald-500/30',
				text: 'text-emerald-400',
				Icon: CheckCircle
			},
			warning: {
				bg: 'bg-amber-500/10 border-amber-500/30',
				text: 'text-amber-400',
				Icon: AlertTriangle
			},
			error: {
				bg: 'bg-rose-500/10 border-rose-500/30',
				text: 'text-rose-400',
				Icon: AlertCircle
			}
		}[variant]
	);
</script>

<div
	class={cn(
		'flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md',
		config.bg,
		className
	)}
	role="alert"
>
	<config.Icon class={cn('mt-0.5 h-5 w-5 shrink-0', config.text)} />

	<div class="flex-1">
		<p class={cn('font-medium', config.text)}>{title}</p>
		{#if message}
			<p class="mt-1 text-sm text-slate-400">{message}</p>
		{/if}
	</div>

	{#if dismissible && onclose}
		<button
			onclick={onclose}
			class="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
		>
			<X class="h-4 w-4" />
		</button>
	{/if}
</div>
