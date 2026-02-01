<script lang="ts">
	import { page } from '$app/stores';
	import { _, locale } from 'svelte-i18n';
	import { base } from '$app/paths';
	import { Button } from '$lib/components/ui/index.js';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import Home from 'lucide-svelte/icons/home';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import Zap from 'lucide-svelte/icons/zap';

	function reload() {
		window.location.reload();
	}

	const isRu = $derived($locale?.startsWith('ru'));

	const errorInfo = $derived.by(() => {
		const ru = $locale?.startsWith('ru');
		const errorMessages: Record<number, { title: string; description: string }> = {
			404: {
				title: ru ? 'Страница не найдена' : 'Page not found',
				description: ru
					? 'Запрашиваемая страница не существует или была перемещена.'
					: 'The page you are looking for does not exist or has been moved.'
			},
			500: {
				title: ru ? 'Ошибка сервера' : 'Server error',
				description: ru
					? 'Произошла внутренняя ошибка сервера. Попробуйте обновить страницу.'
					: 'An internal server error occurred. Please try refreshing the page.'
			},
			503: {
				title: ru ? 'Сервис недоступен' : 'Service unavailable',
				description: ru
					? 'Сервер временно недоступен. Попробуйте позже.'
					: 'The server is temporarily unavailable. Please try again later.'
			}
		};

		const defaultError = {
			title: ru ? 'Что-то пошло не так' : 'Something went wrong',
			description: ru
				? 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.'
				: 'An unexpected error occurred. Please try refreshing the page.'
		};

		return errorMessages[$page.status] || defaultError;
	});
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
	<div class="animate-fade-in space-y-8">
		<!-- Logo -->
		<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
			<AlertTriangle class="h-8 w-8 text-red-400" />
		</div>

		<!-- Error Code -->
		<div class="space-y-2">
			<div class="text-7xl font-bold text-slate-700">{$page.status}</div>
			<h1 class="text-2xl font-semibold text-white">{errorInfo.title}</h1>
			<p class="mx-auto max-w-md text-slate-400">{errorInfo.description}</p>
		</div>

		<!-- Actions -->
		<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
			<Button
				variant="primary"
				size="md"
				class="gap-2 bg-cyan-600 hover:bg-cyan-500"
				onclick={reload}
			>
				<RefreshCw class="h-4 w-4" />
				{isRu ? 'Обновить страницу' : 'Refresh page'}
			</Button>
			<Button
				variant="outline"
				size="md"
				class="gap-2 border-slate-700"
				href="{base}/"
			>
				<Home class="h-4 w-4" />
				{isRu ? 'На главную' : 'Go home'}
			</Button>
		</div>

		<!-- Brand -->
		<div class="flex items-center justify-center gap-2 pt-8 text-slate-600">
			<Zap class="h-4 w-4" />
			<span class="text-sm font-medium">EnergyGuard</span>
		</div>
	</div>
</div>
