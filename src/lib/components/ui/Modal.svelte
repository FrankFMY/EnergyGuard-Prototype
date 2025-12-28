<script lang="ts">
	import { cn } from '$lib/utils.js';
	import X from 'lucide-svelte/icons/x';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		children: import('svelte').Snippet;
	}

	const { open, title, onclose, size = 'md', children }: Props = $props();

	const sizes = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl'
	};

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
		onclick={onclose}
		aria-label="Close modal"
		tabindex="-1"
	></button>
	<!-- Dialog -->
	<div
		class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div
			class={cn(
				'pointer-events-auto w-full rounded-xl border border-white/10 bg-slate-900 shadow-2xl',
				sizes[size]
			)}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-white/5 px-6 py-4">
				<h2 id="modal-title" class="text-lg font-semibold text-white">{title}</h2>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
					aria-label="Close modal"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
