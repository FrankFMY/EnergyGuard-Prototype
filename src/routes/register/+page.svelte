<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp } from '$lib/auth-client.js';
	import { Card, Button } from '$lib/components/ui/index.js';
	import Zap from 'lucide-svelte/icons/zap';
	import Mail from 'lucide-svelte/icons/mail';
	import Lock from 'lucide-svelte/icons/lock';
	import User from 'lucide-svelte/icons/user';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			loading = false;
			return;
		}

		try {
			const result = await signUp.email({
				email,
				password,
				name
			});

			if (result.error) {
				error = result.error.message || 'Registration failed';
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
	<title>Register - KASTOR IoT</title>
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
					<h2 class="text-xl font-semibold text-white">Create your account</h2>
					<p class="mt-1 text-sm text-slate-400">Register to access the monitoring dashboard</p>
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
						<label for="name" class="mb-1.5 block text-sm font-medium text-slate-300">
							Full name
						</label>
						<div class="relative">
							<User class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input
								id="name"
								type="text"
								bind:value={name}
								required
								autocomplete="name"
								placeholder="John Doe"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pr-3 pl-10 text-white placeholder-slate-500 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<label for="email" class="mb-1.5 block text-sm font-medium text-slate-300">
							Email address
						</label>
						<div class="relative">
							<Mail class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input
								id="email"
								type="email"
								bind:value={email}
								required
								autocomplete="email"
								placeholder="operator@kastor.io"
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
								autocomplete="new-password"
								placeholder="••••••••"
								minlength="8"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pr-3 pl-10 text-white placeholder-slate-500 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
							/>
						</div>
						<p class="mt-1 text-xs text-slate-500">Must be at least 8 characters</p>
					</div>

					<div>
						<label for="confirm-password" class="mb-1.5 block text-sm font-medium text-slate-300">
							Confirm password
						</label>
						<div class="relative">
							<Lock class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input
								id="confirm-password"
								type="password"
								bind:value={confirmPassword}
								required
								autocomplete="new-password"
								placeholder="••••••••"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pr-3 pl-10 text-white placeholder-slate-500 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
							/>
						</div>
					</div>
				</div>

				<Button type="submit" class="w-full" disabled={loading} {loading}>
					{loading ? 'Creating account...' : 'Create account'}
				</Button>

				<p class="text-center text-sm text-slate-400">
					Already have an account?
					<a href="/login" class="text-cyan-400 hover:underline">Sign in</a>
				</p>
			</form>
		</Card>

		<p class="mt-6 text-center text-xs text-slate-600">
			By registering, you agree to our terms of service
		</p>
	</div>
</div>
