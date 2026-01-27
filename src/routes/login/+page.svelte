<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/auth-client.js';
	import { Card, Button } from '$lib/components/ui/index.js';
	import Zap from 'lucide-svelte/icons/zap';
	import Mail from 'lucide-svelte/icons/mail';
	import Lock from 'lucide-svelte/icons/lock';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import { _, isLoading } from 'svelte-i18n';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		// Demo Authentication
		if ((email === 'admin' || email === 'admin@energyguard.io') && password === 'admin') {
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
	<title>{$isLoading ? 'Login' : $_('login.pageTitle')} - EnergyGuard</title>
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
				EnergyGuard
			</h1>
			<p class="mt-2 text-sm text-slate-400">
				{#if !$isLoading}{$_('login.subtitle')}{:else}Платформа IoT-мониторинга{/if}
			</p>
		</div>

		<Card>
			<form onsubmit={handleSubmit} class="space-y-6">
				<div>
					<h2 class="text-xl font-semibold text-white">
						{#if !$isLoading}{$_('login.title')}{:else}Вход в систему{/if}
					</h2>
					<p class="mt-1 text-sm text-slate-400">
						{#if !$isLoading}{$_('login.description')}{:else}Введите данные для доступа{/if}
					</p>
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
							{#if !$isLoading}{$_('login.email')}{:else}Email{/if}
						</label>
						<div class="relative">
							<Mail class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input
								id="email"
								type="text"
								bind:value={email}
								required
								autocomplete="username"
								placeholder="admin@energyguard.io"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pr-3 pl-10 text-white placeholder-slate-500 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<label for="password" class="mb-1.5 block text-sm font-medium text-slate-300">
							{#if !$isLoading}{$_('login.password')}{:else}Пароль{/if}
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
						{#if !$isLoading}{$_('login.rememberMe')}{:else}Запомнить меня{/if}
					</label>
					<span
						class="cursor-not-allowed text-slate-500"
						title={$isLoading ? 'Свяжитесь с администратором' : $_('login.contactAdmin')}
					>
						{#if !$isLoading}{$_('login.forgotPassword')}{:else}Забыли пароль?{/if}
					</span>
				</div>

				<Button type="submit" class="w-full" disabled={loading} {loading}>
					{#if loading}
						{#if !$isLoading}{$_('login.signingIn')}{:else}Вход...{/if}
					{:else if !$isLoading}{$_('login.signIn')}{:else}Войти{/if}
				</Button>

				<p class="text-center text-sm text-slate-400">
					{#if !$isLoading}{$_('login.noAccount')}{:else}Нет аккаунта?{/if}
					<a href="/register" class="text-cyan-400 hover:underline">
						{#if !$isLoading}{$_('login.createOne')}{:else}Создать{/if}
					</a>
				</p>
			</form>
		</Card>

		<p class="mt-6 text-center text-xs text-slate-600">
			{#if !$isLoading}{$_('login.protected')}{:else}Защищено шифрованием{/if}
		</p>
	</div>
</div>
