<script lang="ts">
	import { onMount } from 'svelte';
	import { _, isLoading } from 'svelte-i18n';
	import { Card, Button } from '$lib/components/ui/index.js';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';

	interface Props {
		/**
		 * The content to render when there's no error
		 */
		children: import('svelte').Snippet;
		/**
		 * Custom fallback content when an error occurs
		 */
		fallback?: import('svelte').Snippet<[Error | null, () => void]>;
		/**
		 * Called when an error is caught
		 */
		onError?: (error: Error, errorInfo: string) => void;
	}

	let { children, fallback, onError }: Props = $props();

	let error = $state<Error | null>(null);
	let errorInfo = $state<string>('');

	function handleReset() {
		error = null;
		errorInfo = '';
	}

	function handleError(e: ErrorEvent | PromiseRejectionEvent) {
		const err = e instanceof ErrorEvent ? e.error : e.reason;
		if (err instanceof Error) {
			error = err;
			errorInfo = err.stack ?? err.message;
			onError?.(err, errorInfo);
		}
	}

	onMount(() => {
		// Catch unhandled errors
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleError);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleError);
		};
	});
</script>

{#if error}
	{#if fallback}
		{@render fallback(error, handleReset)}
	{:else}
		<Card class="mx-auto my-8 max-w-lg border-rose-500/30 bg-rose-500/5">
			<div class="flex flex-col items-center gap-4 text-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
					<AlertTriangle class="h-8 w-8 text-rose-400" />
				</div>

				<div>
					<h2 class="text-xl font-semibold text-white">
						{#if !$isLoading}{$_('common.error')}{:else}Something went wrong{/if}
					</h2>
					<p class="mt-2 text-sm text-slate-400">
						{error.message || 'An unexpected error occurred'}
					</p>
				</div>

				{#if import.meta.env.DEV && errorInfo}
					<details class="w-full text-left">
						<summary class="cursor-pointer text-sm text-slate-500 hover:text-slate-400">
							Show error details
						</summary>
						<pre
							class="mt-2 max-h-48 overflow-auto rounded bg-slate-900 p-3 text-xs text-rose-300">{errorInfo}</pre>
					</details>
				{/if}

				<div class="flex gap-3">
					<Button variant="outline" onclick={handleReset} class="gap-2">
						<RefreshCw class="h-4 w-4" />
						{#if !$isLoading}{$_('common.retry')}{:else}Try Again{/if}
					</Button>
					<Button onclick={() => window.location.reload()}>Reload Page</Button>
				</div>
			</div>
		</Card>
	{/if}
{:else}
	{@render children()}
{/if}
