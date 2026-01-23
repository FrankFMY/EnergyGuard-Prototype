<script lang="ts">
	import { toastStore } from '$lib/state/toast.svelte.js';
	import { Toast } from '$lib/components/ui/index.js';
	import { fly } from 'svelte/transition';
</script>

{#if toastStore.toasts.length > 0}
	<div
		class="pointer-events-none fixed top-4 right-4 z-sticky flex max-w-sm flex-col gap-2"
		aria-live="polite"
		aria-label="Notifications"
	>
		{#each toastStore.toasts as toast (toast.id)}
			<div
				class="pointer-events-auto"
				in:fly={{ x: 100, duration: 300 }}
				out:fly={{ x: 100, duration: 200 }}
			>
				<Toast
					variant={toast.variant}
					title={toast.title}
					message={toast.message}
					dismissible={toast.dismissible}
					onclose={() => toastStore.dismiss(toast.id)}
				/>
			</div>
		{/each}
	</div>
{/if}
