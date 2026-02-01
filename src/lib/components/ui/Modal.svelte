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

	// Responsive sizes: mobile-first, then scale up at sm breakpoint
	const sizes = {
		sm: 'max-w-[calc(100vw-2rem)] sm:max-w-sm',
		md: 'max-w-[calc(100vw-2rem)] sm:max-w-md',
		lg: 'max-w-[calc(100vw-2rem)] sm:max-w-lg',
		xl: 'max-w-[calc(100vw-2rem)] sm:max-w-xl'
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
				'pointer-events-auto flex w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex-col rounded-xl border border-white/10 bg-slate-900 shadow-2xl',
				sizes[size]
			)}
		>
			<!-- Header -->
			<div class="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6 sm:py-4">
				<h2 id="modal-title" class="text-base font-semibold text-white sm:text-lg">{title}</h2>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
					aria-label="Close modal"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="overflow-y-auto p-4 sm:p-6">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
