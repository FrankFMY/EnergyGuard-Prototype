import { browser } from '$app/environment';
import { init, register, locale, getLocaleFromNavigator } from 'svelte-i18n';

// Register translation files
register('ru', () => import('./locales/ru.json'));
register('en', () => import('./locales/en.json'));

// Initialize with default locale
init({
	fallbackLocale: 'ru',
	initialLocale: browser ? localStorage.getItem('locale') || getLocaleFromNavigator() || 'ru' : 'ru'
});

// Helper to persist locale choice
export function setLocale(lang: string) {
	locale.set(lang);
	if (browser) {
		localStorage.setItem('locale', lang);
	}
}

export { locale } from 'svelte-i18n';
