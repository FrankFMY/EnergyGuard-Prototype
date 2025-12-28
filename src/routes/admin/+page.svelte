<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { Card, Badge, Button } from '$lib/components/ui/index.js';
	import { cn } from '$lib/utils.js';
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
	let showAddModal = $state(false);
	let editingEngine: Engine | null = $state(null);

	// Form state
	let formData = $state({
		id: '',
		model: '',
		planned_power_kw: 0,
		location: ''
	});

	const users = [
		{ id: '1', name: 'Иван Петров', role: 'Администратор', email: 'ivan@kastor.io', active: true },
		{ id: '2', name: 'Мария Сидорова', role: 'Оператор', email: 'maria@kastor.io', active: true },
		{ id: '3', name: 'Алексей Козлов', role: 'Техник', email: 'alexey@kastor.io', active: true },
		{ id: '4', name: 'Елена Волкова', role: 'Наблюдатель', email: 'elena@kastor.io', active: false }
	];

	const connections = [
		{
			id: '1',
			name: 'PLC Siemens S7-1500',
			type: 'Modbus TCP',
			status: 'connected',
			ip: '192.168.1.10'
		},
		{ id: '2', name: 'OPC UA Server', type: 'OPC UA', status: 'connected', ip: '192.168.1.20' },
		{ id: '3', name: 'SCADA Gateway', type: 'MQTT', status: 'disconnected', ip: '192.168.1.30' }
	];

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

	function openAddModal() {
		formData = { id: '', model: '', planned_power_kw: 0, location: '' };
		editingEngine = null;
		showAddModal = true;
	}

	function openEditModal(engine: Engine) {
		formData = {
			id: engine.id,
			model: engine.model,
			planned_power_kw: engine.planned_power_kw,
			location: ''
		};
		editingEngine = engine;
		showAddModal = true;
	}

	function closeModal() {
		showAddModal = false;
		editingEngine = null;
	}

	function handleSubmit() {
		if (editingEngine) {
			// Update existing engine (mock)
			const idx = engines.findIndex((e) => e.id === editingEngine!.id);
			if (idx !== -1) {
				engines[idx] = {
					...engines[idx],
					model: formData.model,
					planned_power_kw: formData.planned_power_kw
				};
			}
		} else {
			// Add new engine (mock)
			const newEngine: Engine = {
				id: formData.id.toLowerCase().replace(/\s+/g, '-'),
				model: formData.model,
				status: 'ok',
				planned_power_kw: formData.planned_power_kw,
				total_hours: 0
			};
			engines = [...engines, newEngine];
		}
		closeModal();
	}

	function deleteEngine(id: string) {
		if (confirm('Вы уверены, что хотите удалить двигатель?')) {
			engines = engines.filter((e) => e.id !== id);
		}
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
				Администрирование
			</h1>
			<p class="mt-1 text-sm text-slate-400">Управление системой, оборудованием и пользователями</p>
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 rounded-lg border border-white/5 bg-slate-900/50 p-1">
		<button
			type="button"
			onclick={() => (activeTab = 'engines')}
			class={cn(
				'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition',
				activeTab === 'engines'
					? 'bg-cyan-500/20 text-cyan-400'
					: 'text-slate-400 hover:bg-white/5 hover:text-white'
			)}
		>
			<Cpu class="h-4 w-4" />
			Оборудование
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'users')}
			class={cn(
				'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition',
				activeTab === 'users'
					? 'bg-cyan-500/20 text-cyan-400'
					: 'text-slate-400 hover:bg-white/5 hover:text-white'
			)}
		>
			<Users class="h-4 w-4" />
			Пользователи
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'connections')}
			class={cn(
				'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition',
				activeTab === 'connections'
					? 'bg-cyan-500/20 text-cyan-400'
					: 'text-slate-400 hover:bg-white/5 hover:text-white'
			)}
		>
			<Link class="h-4 w-4" />
			Подключения
		</button>
	</div>

	<!-- Engines Tab -->
	{#if activeTab === 'engines'}
		<div class="flex justify-end">
			<Button class="gap-2" onclick={openAddModal}>
				<Plus class="h-4 w-4" />
				Добавить двигатель
			</Button>
		</div>

		<div class="grid gap-4">
			{#if loading}
				{#each { length: 4 } as _item, i (i)}
					<Card class="animate-pulse">
						<div class="h-20"></div>
					</Card>
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
										<Badge variant={getStatusBadge(engine.status)}>
											{engine.status}
										</Badge>
									</div>
									<p class="text-sm text-slate-400">
										{engine.model} • {engine.planned_power_kw} кВт • {engine.total_hours.toLocaleString()}
										ч
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Button variant="ghost" size="sm" onclick={() => openEditModal(engine)}>
									<Pencil class="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm">
									<Settings class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="text-rose-400 hover:text-rose-300"
									onclick={() => deleteEngine(engine.id)}
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
			<Button class="gap-2">
				<Plus class="h-4 w-4" />
				Добавить пользователя
			</Button>
		</div>

		<Card class="overflow-hidden p-0">
			<table class="w-full">
				<thead class="border-b border-white/5 bg-slate-900/50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
							>Пользователь</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Роль</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Статус</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase"
							>Действия</th
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
							<td class="px-4 py-4">
								<Badge variant={getRoleBadge(user.role)}>{user.role}</Badge>
							</td>
							<td class="px-4 py-4">
								{#if user.active}
									<Badge variant="success">Активен</Badge>
								{:else}
									<Badge variant="secondary">Неактивен</Badge>
								{/if}
							</td>
							<td class="px-4 py-4 text-right">
								<Button variant="ghost" size="sm">
									<Pencil class="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm" class="text-rose-400 hover:text-rose-300">
									<Trash2 class="h-4 w-4" />
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</Card>
	{/if}

	<!-- Connections Tab -->
	{#if activeTab === 'connections'}
		<div class="flex justify-end">
			<Button class="gap-2">
				<Plus class="h-4 w-4" />
				Добавить подключение
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
							<span class="text-slate-400">IP адрес</span>
							<span class="font-mono text-white">{conn.ip}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-slate-400">Статус</span>
							{#if conn.status === 'connected'}
								<Badge variant="success">Подключено</Badge>
							{:else}
								<Badge variant="danger">Отключено</Badge>
							{/if}
						</div>
					</div>

					<div class="mt-4 flex gap-2">
						<Button variant="secondary" size="sm" class="flex-1 gap-1">
							<Settings class="h-3 w-3" />
							Настроить
						</Button>
						{#if conn.status === 'connected'}
							<Button variant="ghost" size="sm" class="text-rose-400">
								<Power class="h-4 w-4" />
							</Button>
						{:else}
							<Button variant="ghost" size="sm" class="text-emerald-400">
								<Power class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</Card>
			{/each}
		</div>

		<!-- Connection Info -->
		<Card class="border-cyan-500/20 bg-cyan-500/5">
			<div class="flex gap-4">
				<Activity class="h-5 w-5 shrink-0 text-cyan-400" />
				<div class="text-sm text-slate-300">
					<p class="mb-2 font-medium">Поддерживаемые протоколы</p>
					<p class="text-slate-400">
						Система поддерживает Modbus TCP/RTU, OPC UA, MQTT, REST API. Для подключения к ПЛК
						Siemens, Allen-Bradley, Schneider Electric и другим контроллерам используйте
						соответствующий драйвер.
					</p>
				</div>
			</div>
		</Card>
	{/if}
</div>

<!-- Add/Edit Modal -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
		<Card class="w-full max-w-md">
			<h2 class="mb-4 text-lg font-semibold text-white">
				{editingEngine ? 'Редактировать двигатель' : 'Добавить двигатель'}
			</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-4"
			>
				{#if !editingEngine}
					<div>
						<label for="engine-id" class="mb-1 block text-sm font-medium text-slate-300"
							>ID двигателя</label
						>
						<input
							id="engine-id"
							type="text"
							bind:value={formData.id}
							placeholder="gpu-5"
							class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
							required
						/>
					</div>
				{/if}

				<div>
					<label for="engine-model" class="mb-1 block text-sm font-medium text-slate-300"
						>Модель</label
					>
					<input
						id="engine-model"
						type="text"
						bind:value={formData.model}
						placeholder="Jenbacher JGS 620"
						class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
						required
					/>
				</div>

				<div>
					<label for="engine-power" class="mb-1 block text-sm font-medium text-slate-300"
						>Номинальная мощность (кВт)</label
					>
					<input
						id="engine-power"
						type="number"
						bind:value={formData.planned_power_kw}
						placeholder="3350"
						class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
						required
					/>
				</div>

				<div class="flex justify-end gap-3 pt-4">
					<Button type="button" variant="secondary" onclick={closeModal}>Отмена</Button>
					<Button type="submit">{editingEngine ? 'Сохранить' : 'Добавить'}</Button>
				</div>
			</form>
		</Card>
	</div>
{/if}
