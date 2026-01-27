/**
 * Currency State Management using Svelte 5 Runes
 */

export type CurrencyCode = 'RUB' | 'USD' | 'EUR' | 'CNY';

export interface CurrencyInfo {
	code: CurrencyCode;
	symbol: string;
	rate: number; // Rate relative to RUB (1 unit of this currency = X RUB)
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
	RUB: { code: 'RUB', symbol: '₽', rate: 1 },
	USD: { code: 'USD', symbol: '$', rate: 92.5 }, // Example rate
	EUR: { code: 'EUR', symbol: '€', rate: 101.2 }, // Example rate
	CNY: { code: 'CNY', symbol: '¥', rate: 12.8 } // Example rate
};

class CurrencyState {
	#current = $state<CurrencyCode>('RUB');

	get current() {
		return this.#current;
	}

	set current(code: CurrencyCode) {
		this.#current = code;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('energyguard_currency', code);
		}
	}

	get info() {
		return SUPPORTED_CURRENCIES[this.#current];
	}

	constructor() {
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem('energyguard_currency') as CurrencyCode;
			if (saved && SUPPORTED_CURRENCIES[saved]) {
				this.#current = saved;
			}
		}
	}

	/**
	 * Converts a value from RUB to the current currency
	 */
	convert(valueInRub: number): number {
		return valueInRub / this.info.rate;
	}

	/**
	 * Formats a value in the current currency
	 */
	format(valueInRub: number, maximumFractionDigits = 0): string {
		const converted = this.convert(valueInRub);
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: this.#current,
			maximumFractionDigits
		}).format(converted);
	}
}

export const currency = new CurrencyState();
