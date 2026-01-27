<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Card, Button } from '$lib/components/ui/index.js';
	import Settings from 'lucide-svelte/icons/settings';
	import Bell from 'lucide-svelte/icons/bell';
	import Monitor from 'lucide-svelte/icons/monitor';
	import Save from 'lucide-svelte/icons/save';
	import Check from 'lucide-svelte/icons/check';

	const STORAGE_KEY = 'energyguard_settings';

	let emailNotifications = $state(true);
	let smsNotifications = $state(false);
	let pushNotifications = $state(true);
	let refreshRate = $state(2);
	let language = $state('ru');
	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let lastSavedTime = $state<string | null>(null);

	// Load settings from localStorage on mount
	onMount(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const settings = JSON.parse(stored);
				emailNotifications = settings.emailNotifications ?? true;
				smsNotifications = settings.smsNotifications ?? false;
				pushNotifications = settings.pushNotifications ?? true;
				refreshRate = settings.refreshRate ?? 2;
				language = settings.language ?? 'ru';
				lastSavedTime = settings.savedAt ?? null;
			} catch {
				// Ignore parse errors, use defaults
			}
		}
	});

	function saveSettings() {
		saveStatus = 'saving';

		const settings = {
			emailNotifications,
			smsNotifications,
			pushNotifications,
			refreshRate,
			language,
			savedAt: new Date().toISOString()
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		lastSavedTime = settings.savedAt;

		// Show saved status briefly
		setTimeout(() => {
			saveStatus = 'saved';
			setTimeout(() => {
				saveStatus = 'idle';
			}, 2000);
		}, 300);
	}

	function formatLastSaved(isoString: string | null): string {
		if (!isoString) return $_('settings.justNow');
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return $_('settings.justNow');
		if (diffMins < 60) return `${diffMins} ${$_('alerts.minutesAgo')}`;
		return date.toLocaleTimeString();
	}
</script>

<div class="mx-auto max-w-4xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<Settings class="h-7 w-7 text-cyan-400" />
			{$_('settings.title')}
		</h1>
		<p class="mt-1 text-sm text-slate-400">
			{$_('settings.subtitle')}
		</p>
	</div>

	<div class="grid gap-4 sm:gap-6">
		<!-- Notifications -->
		<Card>
			<div class="mb-4 flex items-center gap-3 border-b border-white/5 pb-4 sm:mb-6">
				<div class="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
					<Bell class="h-5 w-5" />
				</div>
				<div>
					<h3 class="text-base font-semibold text-white sm:text-lg">
						{$_('settings.notifications')}
					</h3>
					<p class="text-xs text-slate-400 sm:text-sm">{$_('settings.notificationsDesc')}</p>
				</div>
			</div>

			<div class="space-y-4">
				<div class="flex items-center justify-between gap-4">
					<div class="space-y-0.5">
						<div class="text-sm font-medium text-slate-200">
							{$_('settings.emailNotifications')}
						</div>
						<div class="text-xs text-slate-500">{$_('settings.emailNotificationsDesc')}</div>
					</div>
					<button
						type="button"
						aria-label="Toggle email notifications"
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-hidden {emailNotifications
							? 'bg-cyan-500'
							: 'bg-slate-700'}"
						onclick={() => (emailNotifications = !emailNotifications)}
					>
						<span
							class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out {emailNotifications
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</div>

				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<div class="text-sm font-medium text-slate-200">{$_('settings.smsNotifications')}</div>
						<div class="text-xs text-slate-500">{$_('settings.smsNotificationsDesc')}</div>
					</div>
					<button
						type="button"
						aria-label="Toggle SMS notifications"
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-hidden {smsNotifications
							? 'bg-cyan-500'
							: 'bg-slate-700'}"
						onclick={() => (smsNotifications = !smsNotifications)}
					>
						<span
							class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out {smsNotifications
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</div>

				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<div class="text-sm font-medium text-slate-200">{$_('settings.pushNotifications')}</div>
						<div class="text-xs text-slate-500">{$_('settings.pushNotificationsDesc')}</div>
					</div>
					<button
						type="button"
						aria-label="Toggle push notifications"
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-hidden {pushNotifications
							? 'bg-cyan-500'
							: 'bg-slate-700'}"
						onclick={() => (pushNotifications = !pushNotifications)}
					>
						<span
							class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out {pushNotifications
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</div>
			</div>
		</Card>

		<!-- System -->
		<Card>
			<div class="mb-4 flex items-center gap-3 border-b border-white/5 pb-4 sm:mb-6">
				<div class="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
					<Monitor class="h-5 w-5" />
				</div>
				<div>
					<h3 class="text-base font-semibold text-white sm:text-lg">
						{$_('settings.systemConfig')}
					</h3>
					<p class="text-xs text-slate-400 sm:text-sm">{$_('settings.systemConfigDesc')}</p>
				</div>
			</div>

			<div class="space-y-6">
				<div>
					<label for="refresh-rate" class="mb-2 block text-sm font-medium text-slate-200">
						{$_('settings.refreshRate')}
					</label>
					<div class="flex items-center gap-4">
						<input
							id="refresh-rate"
							type="range"
							min="1"
							max="10"
							step="1"
							bind:value={refreshRate}
							class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-500"
						/>
						<span class="w-12 font-mono text-white">{refreshRate}s</span>
					</div>
				</div>

				<div>
					<label for="language" class="mb-2 block text-sm font-medium text-slate-200">
						{$_('settings.defaultLanguage')}
					</label>
					<select
						id="language"
						bind:value={language}
						class="block w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-cyan-500"
					>
						<option value="en">English</option>
						<option value="ru">Русский</option>
					</select>
				</div>
			</div>
		</Card>
	</div>

	<!-- Save Action -->
	<div
		class="flex items-center justify-end gap-4 rounded-xl border border-white/5 bg-slate-900/50 p-4"
	>
		<span class="text-sm text-slate-500"
			>{$_('settings.lastSaved')}: {formatLastSaved(lastSavedTime)}</span
		>
		<Button onclick={saveSettings} class="gap-2" disabled={saveStatus === 'saving'}>
			{#if saveStatus === 'saved'}
				<Check class="h-4 w-4 text-emerald-400" />
				<span class="text-emerald-400">{$_('settings.saved')}</span>
			{:else if saveStatus === 'saving'}
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"
				></div>
				{$_('common.loading')}
			{:else}
				<Save class="h-4 w-4" />
				{$_('settings.saveChanges')}
			{/if}
		</Button>
	</div>
</div>
