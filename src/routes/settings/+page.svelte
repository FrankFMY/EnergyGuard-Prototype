<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card, Button } from '$lib/components/ui/index.js';
	import Settings from 'lucide-svelte/icons/settings';
	import Bell from 'lucide-svelte/icons/bell';
	import Monitor from 'lucide-svelte/icons/monitor';
	import Save from 'lucide-svelte/icons/save';

	let emailNotifications = $state(true);
	let smsNotifications = $state(false);
	let pushNotifications = $state(true);
	let refreshRate = $state(2);
	let language = $state('ru');

	function saveSettings() {
		// Mock save
		alert('Settings saved successfully!');
	}
</script>

<div class="mx-auto max-w-4xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
			<Settings class="h-7 w-7 text-cyan-400" />
			{$_('nav.settings') || 'Settings'}
		</h1>
		<p class="mt-1 text-sm text-slate-400">
			Manage your application preferences and configurations.
		</p>
	</div>

	<div class="grid gap-6">
		<!-- Notifications -->
		<Card>
			<div class="mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
				<div class="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
					<Bell class="h-5 w-5" />
				</div>
				<div>
					<h3 class="font-semibold text-white">Notifications</h3>
					<p class="text-xs text-slate-400">Manage how you receive alerts</p>
				</div>
			</div>

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<div class="text-sm font-medium text-slate-200">Email Notifications</div>
						<div class="text-xs text-slate-500">Receive daily summaries and critical alerts</div>
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
						<div class="text-sm font-medium text-slate-200">SMS Alerts</div>
						<div class="text-xs text-slate-500">Receive instant SMS for critical failures</div>
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
						<div class="text-sm font-medium text-slate-200">Push Notifications</div>
						<div class="text-xs text-slate-500">Browser notifications for real-time events</div>
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
			<div class="mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
				<div class="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
					<Monitor class="h-5 w-5" />
				</div>
				<div>
					<h3 class="font-semibold text-white">System Configuration</h3>
					<p class="text-xs text-slate-400">Dashboard refresh and display settings</p>
				</div>
			</div>

			<div class="space-y-6">
				<div>
					<label for="refresh-rate" class="mb-2 block text-sm font-medium text-slate-200">
						Dashboard Refresh Rate (seconds)
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
						Default Language
					</label>
					<select
						id="language"
						bind:value={language}
						class="block w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-cyan-500"
					>
						<option value="en">English</option>
						<option value="ru">Русский</option>
						<option value="de">Deutsch</option>
					</select>
				</div>
			</div>
		</Card>
	</div>

	<!-- Save Action -->
	<div
		class="flex items-center justify-end gap-4 rounded-xl border border-white/5 bg-slate-900/50 p-4"
	>
		<span class="text-sm text-slate-500">Last saved: Just now</span>
		<Button onclick={saveSettings} class="gap-2">
			<Save class="h-4 w-4" />
			Save Changes
		</Button>
	</div>
</div>
