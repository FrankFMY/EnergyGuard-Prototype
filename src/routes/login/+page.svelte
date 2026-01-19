<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/auth-client.js';
	import { Card, Button } from '$lib/components/ui/index.js';
	import Zap from 'lucide-svelte/icons/zap';
	import Mail from 'lucide-svelte/icons/mail';
	import Lock from 'lucide-svelte/icons/lock';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		// Demo Authentication
		if ((email === 'admin' || email === 'admin@kastor.io') && password === 'admin') {
			// Set demo cookie
			document.cookie = 'demo_session=true; path=/; max-age=86400; samesite=strict';

			// Simulate network delay
			setTimeout(() => {
				loading = false;
				goto('/');
			}, 800);
			return;
		}

		try {
			const result = await signIn.email({
				email,
				password
			});

			if (result.error) {
				error = result.error.message || 'Invalid credentials';
			} else {
				goto('/');
			}
		} catch (err) {
			error = 'An error occurred. Please try again.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - KASTOR IoT</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-950 px-4">
	<div class="w-full max-w-md">
		<!-- Logo -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 ring-2 ring-cyan-500/50"
			>
				<Zap class="h-8 w-8 fill-current" />
			</div>
			<h1 class="text-3xl font-bold text-white">
				KASTOR <span class="font-normal text-slate-500">IoT</span>
			</h1>
			<p class="mt-2 text-sm text-slate-400">Industrial IoT Monitoring Platform</p>
		</div>

		<Card>
			<form onsubmit={handleSubmit} class="space-y-6">
				<div>
					<h2 class="text-xl font-semibold text-white">Sign in to your account</h2>
					<p class="mt-1 text-sm text-slate-400">Enter your credentials to access the dashboard</p>
				</div>

				{#if error}
					<div
						class="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400"
					>
						<AlertCircle class="h-4 w-4 shrink-0" />
						{error}
					</div>
				{/if}

				<div class="space-y-4">
					<div>
						<label for="email" class="mb-1.5 block text-sm font-medium text-slate-300">
							Email address
						</label>
						<div class="relative">
							<Mail class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input
								id="email"
								type="text"
								bind:value={email}
								required
								autocomplete="username"
								placeholder="operator@kastor.io or admin"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pr-3 pl-10 text-white placeholder-slate-500 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<label for="password" class="mb-1.5 block text-sm font-medium text-slate-300">
							Password
						</label>
						<div class="relative">
							<Lock class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input
								id="password"
								type="password"
								bind:value={password}
								required
								autocomplete="current-password"
								placeholder="••••••••"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pr-3 pl-10 text-white placeholder-slate-500 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
							/>
						</div>
					</div>
				</div>

				<div class="flex items-center justify-between text-sm">
					<label class="flex items-center gap-2 text-slate-400">
						<input
							type="checkbox"
							class="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20"
						/>
						Remember me
					</label>
					<span class="cursor-not-allowed text-slate-500" title="Contact administrator"
						>Forgot password?</span
					>
				</div>

				<Button type="submit" class="w-full" disabled={loading} {loading}>
					{loading ? 'Signing in...' : 'Sign in'}
				</Button>

				<p class="text-center text-sm text-slate-400">
					Don't have an account?
					<a href="/register" class="text-cyan-400 hover:underline">Create one</a>
				</p>
			</form>
		</Card>

		<p class="mt-6 text-center text-xs text-slate-600">Protected by rate limiting and encryption</p>
	</div>
</div>
