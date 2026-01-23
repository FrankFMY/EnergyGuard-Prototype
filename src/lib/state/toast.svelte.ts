// Global toast notification store using Svelte 5 runes

export interface ToastData {
	id: string;
	variant: 'info' | 'success' | 'warning' | 'error';
	title: string;
	message?: string;
	duration?: number;
	dismissible?: boolean;
}

class ToastStore {
	toasts = $state<ToastData[]>([]);

	add(toast: Omit<ToastData, 'id'>) {
		const id = crypto.randomUUID();
		const newToast: ToastData = {
			id,
			dismissible: true,
			duration: 5000,
			...toast
		};

		this.toasts = [...this.toasts, newToast];

		// Auto-dismiss after duration
		if (newToast.duration && newToast.duration > 0) {
			setTimeout(() => {
				this.dismiss(id);
			}, newToast.duration);
		}

		return id;
	}

	dismiss(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	clear() {
		this.toasts = [];
	}

	// Convenience methods
	success(title: string, message?: string) {
		return this.add({ variant: 'success', title, message });
	}

	error(title: string, message?: string) {
		return this.add({ variant: 'error', title, message });
	}

	warning(title: string, message?: string) {
		return this.add({ variant: 'warning', title, message });
	}

	info(title: string, message?: string) {
		return this.add({ variant: 'info', title, message });
	}
}

export const toastStore = new ToastStore();
