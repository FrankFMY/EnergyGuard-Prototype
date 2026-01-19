<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { Card, Badge, Button, Modal } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
	import { _ } from 'svelte-i18n';
	import Shield from 'lucide-svelte/icons/shield';
	import Server from 'lucide-svelte/icons/server';
	import Users from 'lucide-svelte/icons/users';
	import Cpu from 'lucide-svelte/icons/cpu';
	import Settings from 'lucide-svelte/icons/settings';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Power from 'lucide-svelte/icons/power';
	import Activity from 'lucide-svelte/icons/activity';
	import Link from 'lucide-svelte/icons/link';
	import type { Engine } from '$lib/types/index.js';

	let engines: Engine[] = $state([]);
	let loading = $state(true);

	// Engine modal state
	let showEngineModal = $state(false);
	let editingEngine: Engine | null = $state(null);
	let engineForm = $state({
		id: '',
		model: '',
		planned_power_kw: 1200,
		location: ''
	});

	// User modal state
	let showUserModal = $state(false);
	let editingUser: (typeof users)[0] | null = $state(null);
	let userForm = $state({
		name: '',
		email: '',
		role: 'Оператор',
		active: true
	});

	// Connection modal state
	let showConnectionModal = $state(false);
	let editingConnection: (typeof connections)[0] | null = $state(null);
	let connectionForm = $state({
		name: '',
		type: 'Modbus TCP',
		ip: '',
		status: 'disconnected'
	});

	// Delete confirmation
	let showDeleteConfirm = $state(false);
	let deleteTarget = $state<{
		type: 'engine' | 'user' | 'connection';
		id: string;
		name: string;
	} | null>(null);

	let users = $state([
		{ id: '1', name: 'Иван Петров', role: 'Администратор', email: 'ivan@kastor.io', active: true },
		{ id: '2', name: 'Мария Сидорова', role: 'Оператор', email: 'maria@kastor.io', active: true },
		{ id: '3', name: 'Алексей Козлов', role: 'Техник', email: 'alexey@kastor.io', active: true },
		{ id: '4', name: 'Елена Волкова', role: 'Наблюдатель', email: 'elena@kastor.io', active: false }
	]);

	let connections = $state([
		{
			id: '1',
			name: 'PLC Siemens S7-1500',
			type: 'Modbus TCP',
			status: 'connected',
			ip: '192.168.1.10'
		},
		{ id: '2', name: 'OPC UA Server', type: 'OPC UA', status: 'connected', ip: '192.168.1.20' },
		{ id: '3', name: 'SCADA Gateway', type: 'MQTT', status: 'disconnected', ip: '192.168.1.30' }
	]);

	type TabId = 'engines' | 'users' | 'connections';
	let activeTab: TabId = $state('engines');

	onMount(async () => {
		try {
			const res = await fetch(`${base}/api/status`);
			if (res.ok) {
				const data = await res.json();
				engines = data.engines;
			}
		} finally {
			loading = false;
		}
	});

	// Engine handlers
	function openAddEngine() {
		engineForm = { id: '', model: '', planned_power_kw: 1200, location: '' };
		editingEngine = null;
		showEngineModal = true;
	}

	function openEditEngine(engine: Engine) {
		engineForm = {
			id: engine.id,
			model: engine.model,
			planned_power_kw: engine.planned_power_kw,
			location: ''
		};
		editingEngine = engine;
		showEngineModal = true;
	}

	function handleEngineSubmit() {
		if (editingEngine) {
			const idx = engines.findIndex((e) => e.id === editingEngine!.id);
			if (idx !== -1) {
				engines[idx] = {
					...engines[idx],
					model: engineForm.model,
					planned_power_kw: engineForm.planned_power_kw
				};
			}
		} else {
			const newEngine: Engine = {
				id: engineForm.id.toLowerCase().replace(/\s+/g, '-'),
				model: engineForm.model,
				status: 'ok',
				planned_power_kw: engineForm.planned_power_kw,
				total_hours: 0
			};
			engines = [...engines, newEngine];
		}
		showEngineModal = false;
	}

	// User handlers
	function openAddUser() {
		userForm = { name: '', email: '', role: 'Оператор', active: true };
		editingUser = null;
		showUserModal = true;
	}

	function openEditUser(user: (typeof users)[0]) {
		userForm = { name: user.name, email: user.email, role: user.role, active: user.active };
		editingUser = user;
		showUserModal = true;
	}

	function handleUserSubmit() {
		if (editingUser) {
			const idx = users.findIndex((u) => u.id === editingUser!.id);
			if (idx !== -1) {
				users[idx] = { ...users[idx], ...userForm };
			}
		} else {
			const newUser = {
				id: String(Date.now()),
				...userForm
			};
			users = [...users, newUser];
		}
		showUserModal = false;
	}

	// Connection handlers
	function openAddConnection() {
		connectionForm = { name: '', type: 'Modbus TCP', ip: '', status: 'disconnected' };
		editingConnection = null;
		showConnectionModal = true;
	}

	function openEditConnection(conn: (typeof connections)[0]) {
		connectionForm = { name: conn.name, type: conn.type, ip: conn.ip, status: conn.status };
		editingConnection = conn;
		showConnectionModal = true;
	}

	function handleConnectionSubmit() {
		if (editingConnection) {
			const idx = connections.findIndex((c) => c.id === editingConnection!.id);
			if (idx !== -1) {
				connections[idx] = { ...connections[idx], ...connectionForm };
			}
		} else {
			const newConn = {
				id: String(Date.now()),
				...connectionForm
			};
			connections = [...connections, newConn];
		}
		showConnectionModal = false;
	}

	function toggleConnectionStatus(conn: (typeof connections)[0]) {
		const idx = connections.findIndex((c) => c.id === conn.id);
		if (idx !== -1) {
			connections[idx] = {
				...connections[idx],
				status: connections[idx].status === 'connected' ? 'disconnected' : 'connected'
			};
		}
	}

	// Delete handlers
	function confirmDelete(type: 'engine' | 'user' | 'connection', id: string, name: string) {
		deleteTarget = { type, id, name };
		showDeleteConfirm = true;
	}

	function executeDelete() {
		if (!deleteTarget) return;

		switch (deleteTarget.type) {
			case 'engine':
				engines = engines.filter((e) => e.id !== deleteTarget!.id);
				break;
			case 'user':
				users = users.filter((u) => u.id !== deleteTarget!.id);
				break;
			case 'connection':
				connections = connections.filter((c) => c.id !== deleteTarget!.id);
				break;
		}
		showDeleteConfirm = false;
		deleteTarget = null;
	}

	function getStatusBadge(status: string) {
		const map: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
			ok: 'success',
			warning: 'warning',
			error: 'danger'
		};
		return map[status] || 'secondary';
	}

	function getRoleBadge(role: string) {
		const map: Record<string, 'danger' | 'warning' | 'info' | 'secondary'> = {
			Администратор: 'danger',
			Оператор: 'warning',
			Техник: 'info',
			Наблюдатель: 'secondary'
		};
		return map[role] || 'secondary';
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-white">
				<Shield class="h-7 w-7 text-cyan-400" />
				{$_('admin.title')}
			</h1>
			<p class="mt-1 text-sm text-slate-400">{$_('admin.subtitle')}</p>
		</div>
		<Badge variant="warning" class="self-start sm:self-auto">Demo Mode</Badge>
	</div>

	<!-- Tabs -->
	<div class="-mx-4 px-4 sm:mx-0 sm:px-0">
		<div
			class="scrollbar-hide flex gap-1 overflow-x-auto rounded-lg border border-white/5 bg-slate-900/50 p-1"
		>
			<button
				type="button"
				onclick={() => (activeTab = 'engines')}
				class={cn(
					'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition sm:px-4',
					activeTab === 'engines'
						? 'bg-cyan-500/20 text-cyan-400'
						: 'text-slate-400 hover:bg-white/5 hover:text-white'
				)}
			>
				<Cpu class="h-4 w-4" />
				<span class="whitespace-nowrap">{$_('admin.tabs.engines')}</span>
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'users')}
				class={cn(
					'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition sm:px-4',
					activeTab === 'users'
						? 'bg-cyan-500/20 text-cyan-400'
						: 'text-slate-400 hover:bg-white/5 hover:text-white'
				)}
			>
				<Users class="h-4 w-4" />
				<span class="whitespace-nowrap">{$_('admin.tabs.users')}</span>
				<span class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400"
					>Demo</span
				>
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'connections')}
				class={cn(
					'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition sm:px-4',
					activeTab === 'connections'
						? 'bg-cyan-500/20 text-cyan-400'
						: 'text-slate-400 hover:bg-white/5 hover:text-white'
				)}
			>
				<Link class="h-4 w-4" />
				<span class="whitespace-nowrap">{$_('admin.tabs.connections')}</span>
				<span class="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400"
					>Demo</span
				>
			</button>
		</div>
	</div>

	<!-- Engines Tab -->
	{#if activeTab === 'engines'}
		<div class="flex justify-end">
			<Button class="gap-2" onclick={openAddEngine}>
				<Plus class="h-4 w-4" />
				{$_('admin.engines.addEngine')}
			</Button>
		</div>

		<div class="grid gap-4">
			{#if loading}
				{#each { length: 4 } as _item, i (i)}
					<Card class="animate-pulse"><div class="h-20"></div></Card>
				{/each}
			{:else}
				{#each engines as engine (engine.id)}
					<Card>
						<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex items-center gap-4">
								<div
									class={cn(
										'flex h-12 w-12 items-center justify-center rounded-lg',
										engine.status === 'ok'
											? 'bg-emerald-500/20 text-emerald-400'
											: 'bg-slate-700 text-slate-400'
									)}
								>
									<Cpu class="h-6 w-6" />
								</div>
								<div>
									<div class="flex items-center gap-3">
										<h3 class="font-semibold text-white uppercase">{engine.id}</h3>
										<Badge variant={getStatusBadge(engine.status)}>{engine.status}</Badge>
									</div>
									<p class="text-sm text-slate-400">
										{engine.model} • {engine.planned_power_kw}
										{$_('common.kw')} • {engine.total_hours.toLocaleString()}
										{$_('units.hours')}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Button variant="ghost" size="sm" onclick={() => openEditEngine(engine)}>
									<Pencil class="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm">
									<Settings class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="text-rose-400 hover:text-rose-300"
									onclick={() => confirmDelete('engine', engine.id, engine.id.toUpperCase())}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</div>
					</Card>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Users Tab -->
	{#if activeTab === 'users'}
		<div class="flex justify-end">
			<Button class="gap-2" onclick={openAddUser}>
				<Plus class="h-4 w-4" />
				{$_('admin.users.addUser')}
			</Button>
		</div>

		<!-- Mobile Card View -->
		<div class="space-y-3 md:hidden">
			{#each users as user (user.id)}
				<Card>
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							<div
								class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white"
							>
								{user.name
									.split(' ')
									.map((n) => n[0])
									.join('')}
							</div>
							<div class="min-w-0">
								<div class="font-medium text-white">{user.name}</div>
								<div class="truncate text-xs text-slate-500">{user.email}</div>
							</div>
						</div>
						<div class="flex shrink-0 gap-1">
							<Button variant="ghost" size="sm" onclick={() => openEditUser(user)}>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="text-rose-400 hover:text-rose-300"
								onclick={() => confirmDelete('user', user.id, user.name)}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<Badge variant={getRoleBadge(user.role)}>{user.role}</Badge>
						{#if user.active}
							<Badge variant="success">{$_('admin.users.status.active')}</Badge>
						{:else}
							<Badge variant="secondary">{$_('admin.users.status.inactive')}</Badge>
						{/if}
					</div>
				</Card>
			{/each}
		</div>

		<!-- Desktop Table View -->
		<Card class="hidden overflow-hidden p-0 md:block">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b border-white/5 bg-slate-900/50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
								>{$_('admin.users.table.user')}</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
								>{$_('admin.users.table.role')}</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
								>{$_('admin.users.table.status')}</th
							>
							<th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase"
								>{$_('admin.users.table.actions')}</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/5">
						{#each users as user (user.id)}
							<tr class="transition hover:bg-white/5">
								<td class="px-4 py-4">
									<div class="flex items-center gap-3">
										<div
											class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white"
										>
											{user.name
												.split(' ')
												.map((n) => n[0])
												.join('')}
										</div>
										<div>
											<div class="font-medium text-white">{user.name}</div>
											<div class="text-xs text-slate-500">{user.email}</div>
										</div>
									</div>
								</td>
								<td class="px-4 py-4"
									><Badge variant={getRoleBadge(user.role)}>{user.role}</Badge></td
								>
								<td class="px-4 py-4">
									{#if user.active}
										<Badge variant="success">{$_('admin.users.status.active')}</Badge>
									{:else}
										<Badge variant="secondary">{$_('admin.users.status.inactive')}</Badge>
									{/if}
								</td>
								<td class="px-4 py-4 text-right">
									<Button variant="ghost" size="sm" onclick={() => openEditUser(user)}>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="text-rose-400 hover:text-rose-300"
										onclick={() => confirmDelete('user', user.id, user.name)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}

	<!-- Connections Tab -->
	{#if activeTab === 'connections'}
		<div class="flex justify-end">
			<Button class="gap-2" onclick={openAddConnection}>
				<Plus class="h-4 w-4" />
				{$_('admin.connections.addConnection')}
			</Button>
		</div>

		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each connections as conn (conn.id)}
				<Card>
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div
								class={cn(
									'flex h-10 w-10 items-center justify-center rounded-lg',
									conn.status === 'connected'
										? 'bg-emerald-500/20 text-emerald-400'
										: 'bg-rose-500/20 text-rose-400'
								)}
							>
								<Server class="h-5 w-5" />
							</div>
							<div>
								<h3 class="font-semibold text-white">{conn.name}</h3>
								<p class="text-xs text-slate-500">{conn.type}</p>
							</div>
						</div>
					</div>

					<div class="space-y-2 text-sm">
						<div class="flex items-center justify-between">
							<span class="text-slate-400">{$_('admin.connections.ipAddress')}</span>
							<span class="font-mono text-white">{conn.ip}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-slate-400">{$_('admin.connections.status')}</span>
							{#if conn.status === 'connected'}
								<Badge variant="success">{$_('admin.connections.connected')}</Badge>
							{:else}
								<Badge variant="danger">{$_('admin.connections.disconnected')}</Badge>
							{/if}
						</div>
					</div>

					<div class="mt-4 flex gap-2">
						<Button
							variant="secondary"
							size="sm"
							class="flex-1 gap-1"
							onclick={() => openEditConnection(conn)}
						>
							<Settings class="h-3 w-3" />
							{$_('admin.connections.configure')}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class={conn.status === 'connected' ? 'text-rose-400' : 'text-emerald-400'}
							onclick={() => toggleConnectionStatus(conn)}
						>
							<Power class="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class="text-rose-400 hover:text-rose-300"
							onclick={() => confirmDelete('connection', conn.id, conn.name)}
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				</Card>
			{/each}
		</div>

		<!-- Connection Info -->
		<Card class="border-cyan-500/20 bg-cyan-500/5">
			<div class="flex gap-4">
				<Activity class="h-5 w-5 shrink-0 text-cyan-400" />
				<div class="text-sm text-slate-300">
					<p class="mb-2 font-medium">{$_('admin.connections.supportedProtocols')}</p>
					<p class="text-slate-400">{$_('admin.connections.protocolsDescription')}</p>
				</div>
			</div>
		</Card>
	{/if}
</div>

<!-- Engine Modal -->
<Modal
	open={showEngineModal}
	title={editingEngine ? $_('admin.engines.editEngine') : $_('admin.engines.addEngine')}
	onclose={() => (showEngineModal = false)}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleEngineSubmit();
		}}
		class="space-y-4"
	>
		{#if !editingEngine}
			<div>
				<label for="engine-id" class="mb-1 block text-sm font-medium text-slate-300"
					>{$_('admin.engines.engineId')}</label
				>
				<input
					id="engine-id"
					type="text"
					bind:value={engineForm.id}
					placeholder="gpu-7"
					class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
					required
				/>
			</div>
		{/if}

		<div>
			<label for="engine-model" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.engines.model')}</label
			>
			<input
				id="engine-model"
				type="text"
				bind:value={engineForm.model}
				placeholder="Jenbacher JGS 620"
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
				required
			/>
		</div>

		<div>
			<label for="engine-power" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.engines.nominalPower')}</label
			>
			<input
				id="engine-power"
				type="number"
				bind:value={engineForm.planned_power_kw}
				placeholder="3350"
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
				required
			/>
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<Button type="button" variant="secondary" onclick={() => (showEngineModal = false)}
				>{$_('common.cancel')}</Button
			>
			<Button type="submit">{editingEngine ? $_('common.save') : $_('common.add')}</Button>
		</div>
	</form>
</Modal>

<!-- User Modal -->
<Modal
	open={showUserModal}
	title={editingUser ? $_('admin.users.editUser') : $_('admin.users.addUser')}
	onclose={() => (showUserModal = false)}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleUserSubmit();
		}}
		class="space-y-4"
	>
		<div>
			<label for="user-name" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.users.name')}</label
			>
			<input
				id="user-name"
				type="text"
				bind:value={userForm.name}
				placeholder="Иван Иванов"
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
				required
			/>
		</div>

		<div>
			<label for="user-email" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.users.email')}</label
			>
			<input
				id="user-email"
				type="email"
				bind:value={userForm.email}
				placeholder="user@kastor.io"
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
				required
			/>
		</div>

		<div>
			<label for="user-role" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.users.role')}</label
			>
			<select
				id="user-role"
				bind:value={userForm.role}
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
			>
				<option value="Администратор">{$_('admin.users.roles.admin')}</option>
				<option value="Оператор">{$_('admin.users.roles.operator')}</option>
				<option value="Техник">{$_('admin.users.roles.technician')}</option>
				<option value="Наблюдатель">{$_('admin.users.roles.viewer')}</option>
			</select>
		</div>

		<div class="flex items-center gap-3">
			<input
				id="user-active"
				type="checkbox"
				bind:checked={userForm.active}
				class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
			/>
			<label for="user-active" class="text-sm text-slate-300"
				>{$_('admin.users.activeAccount')}</label
			>
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<Button type="button" variant="secondary" onclick={() => (showUserModal = false)}
				>{$_('common.cancel')}</Button
			>
			<Button type="submit">{editingUser ? $_('common.save') : $_('common.add')}</Button>
		</div>
	</form>
</Modal>

<!-- Connection Modal -->
<Modal
	open={showConnectionModal}
	title={editingConnection
		? $_('admin.connections.editConnection')
		: $_('admin.connections.addConnection')}
	onclose={() => (showConnectionModal = false)}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleConnectionSubmit();
		}}
		class="space-y-4"
	>
		<div>
			<label for="conn-name" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.connections.name')}</label
			>
			<input
				id="conn-name"
				type="text"
				bind:value={connectionForm.name}
				placeholder="PLC Controller"
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
				required
			/>
		</div>

		<div>
			<label for="conn-type" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.connections.protocol')}</label
			>
			<select
				id="conn-type"
				bind:value={connectionForm.type}
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
			>
				<option value="Modbus TCP">Modbus TCP</option>
				<option value="Modbus RTU">Modbus RTU</option>
				<option value="OPC UA">OPC UA</option>
				<option value="MQTT">MQTT</option>
				<option value="REST API">REST API</option>
			</select>
		</div>

		<div>
			<label for="conn-ip" class="mb-1 block text-sm font-medium text-slate-300"
				>{$_('admin.connections.ipAddress')}</label
			>
			<input
				id="conn-ip"
				type="text"
				bind:value={connectionForm.ip}
				placeholder="192.168.1.100"
				class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
				required
			/>
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<Button type="button" variant="secondary" onclick={() => (showConnectionModal = false)}
				>{$_('common.cancel')}</Button
			>
			<Button type="submit">{editingConnection ? $_('common.save') : $_('common.add')}</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
	open={showDeleteConfirm}
	title={$_('common.confirmDelete')}
	onclose={() => (showDeleteConfirm = false)}
	size="sm"
>
	<p class="text-slate-300">
		{$_('common.deleteConfirmMessage', { values: { name: deleteTarget?.name || '' } })}
	</p>
	<div class="mt-6 flex justify-end gap-3">
		<Button variant="secondary" onclick={() => (showDeleteConfirm = false)}
			>{$_('common.cancel')}</Button
		>
		<Button variant="danger" onclick={executeDelete}>{$_('common.delete')}</Button>
	</div>
</Modal>
