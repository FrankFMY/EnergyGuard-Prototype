<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import WifiOff from 'lucide-svelte/icons/wifi-off';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import { slide } from 'svelte/transition';

	let isOnline = $state(true);
	let isApiHealthy = $state(true);
	let isReconnecting = $state(false);
	let reconnectAttempts = $state(0);
	let showBanner = $state(false);
	let lastError = $state<string | null>(null);

	const MAX_RECONNECT_ATTEMPTS = 5;
	const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
	const RECONNECT_DELAY = 3000; // 3 seconds

	async function checkApiHealth(): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const res = await fetch(`${base}/api/health`, {
				signal: controller.signal
			});

			clearTimeout(timeoutId);
			return res.ok;
		} catch {
			return false;
		}
	}

	async function attemptReconnect() {
		if (isReconnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

		isReconnecting = true;
		reconnectAttempts++;

		const healthy = await checkApiHealth();

		if (healthy) {
			isApiHealthy = true;
			isReconnecting = false;
			reconnectAttempts = 0;
			lastError = null;

			// Hide banner after short delay
			setTimeout(() => {
				if (isOnline && isApiHealthy) {
					showBanner = false;
				}
			}, 2000);
		} else {
			isReconnecting = false;

			// Schedule next attempt with exponential backoff
			if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
				const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
				setTimeout(attemptReconnect, delay);
			} else {
				lastError = 'Maximum reconnection attempts reached. Please refresh the page.';
			}
		}
	}

	function handleOnline() {
		isOnline = true;
		reconnectAttempts = 0;
		attemptReconnect();
	}

	function handleOffline() {
		isOnline = false;
		isApiHealthy = false;
		showBanner = true;
		lastError = 'No internet connection';
	}

	function manualReconnect() {
		reconnectAttempts = 0;
		lastError = null;
		attemptReconnect();
	}

	onMount(() => {
		// Check initial state
		isOnline = navigator.onLine;

		// Listen for network status changes
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Initial health check
		checkApiHealth().then((healthy) => {
			isApiHealthy = healthy;
			if (!healthy) {
				showBanner = true;
				attemptReconnect();
			}
		});

		// Periodic health checks
		const interval = setInterval(async () => {
			if (isOnline && !isReconnecting) {
				const healthy = await checkApiHealth();
				if (!healthy && isApiHealthy) {
					isApiHealthy = false;
					showBanner = true;
					attemptReconnect();
				}
			}
		}, HEALTH_CHECK_INTERVAL);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			clearInterval(interval);
		};
	});

	// Show banner when offline or API unhealthy
	$effect(() => {
		if (!isOnline || !isApiHealthy) {
			showBanner = true;
		}
	});

	// Computed classes
	const isWarning = $derived(isReconnecting || reconnectAttempts < MAX_RECONNECT_ATTEMPTS);
	const isSuccess = $derived(isOnline && isApiHealthy);
	const isError = $derived(!isReconnecting && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS);

	const bannerBorderClass = $derived(
		cn(
			'fixed inset-x-0 top-0 z-50 border-b',
			isWarning && 'border-amber-500/30',
			isSuccess && 'border-emerald-500/30',
			isError && 'border-rose-500/30'
		)
	);

	const bannerBgClass = $derived(
		cn(
			'px-4 py-3',
			isWarning && 'bg-amber-500/10',
			isSuccess && 'bg-emerald-500/10',
			isError && 'bg-rose-500/10'
		)
	);

	const iconClass = $derived(
		cn('h-5 w-5', isReconnecting && 'text-amber-400', isError && 'text-rose-400')
	);

	const textClass = $derived(
		cn('text-sm font-medium', isWarning && 'text-amber-400', isError && 'text-rose-400')
	);

	const buttonClass = $derived(
		cn(
			'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
			isReconnecting && 'bg-amber-500/20 text-amber-300',
			isError && 'bg-rose-500/20 text-rose-300',
			!isReconnecting && !isError && 'hover:bg-amber-500/30',
			isError && 'hover:bg-rose-500/30'
		)
	);
</script>

{#if showBanner && (!isOnline || !isApiHealthy)}
	<div class={bannerBorderClass} transition:slide={{ duration: 300 }}>
		<div class={bannerBgClass}>
			<div class="mx-auto flex max-w-7xl items-center justify-between">
				<div class="flex items-center gap-3">
					{#if isOnline && isApiHealthy}
						<CheckCircle class="h-5 w-5 text-emerald-400" />
						<span class="text-sm font-medium text-emerald-400">Connection restored</span>
					{:else}
						<WifiOff class={iconClass} />
						<div class="flex flex-col">
							<span class={textClass}>
								{#if !isOnline}
									No internet connection
								{:else if isReconnecting}
									Reconnecting to server...
								{:else if reconnectAttempts >= MAX_RECONNECT_ATTEMPTS}
									Unable to connect to server
								{:else}
									Connection lost
								{/if}
							</span>
							{#if lastError && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS}
								<span class="text-xs text-slate-400">{lastError}</span>
							{:else if isReconnecting}
								<span class="text-xs text-slate-400">
									Attempt {reconnectAttempts} of {MAX_RECONNECT_ATTEMPTS}
								</span>
							{/if}
						</div>
					{/if}
				</div>

				{#if !isOnline || !isApiHealthy}
					<button
						type="button"
						class={buttonClass}
						onclick={manualReconnect}
						disabled={isReconnecting}
					>
						<RefreshCw class={cn('h-4 w-4', isReconnecting && 'animate-spin')} />
						{isReconnecting ? 'Connecting...' : 'Retry'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
