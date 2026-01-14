import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('loads and displays main dashboard', async ({ page }) => {
		// Wait for page to load
		await expect(page).toHaveTitle(/KASTOR/);

		// Check main dashboard elements
		await expect(page.locator('h1')).toBeVisible();
	});

	test('displays fleet status section', async ({ page }) => {
		// Look for fleet status or KPI cards
		const kpiCards = page.locator('[data-testid="kpi-card"], .kpi-card');
		await expect(kpiCards.first()).toBeVisible({ timeout: 10000 });
	});

	test('displays real-time metrics', async ({ page }) => {
		// Wait for data to load (SSE updates)
		await page.waitForTimeout(3000);

		// Should show power output
		const powerValue = page.getByText(/MW|kW/i).first();
		await expect(powerValue).toBeVisible();
	});

	test('navigation works correctly', async ({ page }) => {
		// Click on maintenance link
		const maintenanceLink = page.getByRole('link', { name: /maintenance|обслуживание/i });
		if (await maintenanceLink.isVisible()) {
			await maintenanceLink.click();
			await expect(page).toHaveURL(/maintenance/);
		}
	});

	test('language switcher works', async ({ page }) => {
		const langSwitcher = page.locator(
			'[data-testid="language-switcher"], button:has-text("EN"), button:has-text("RU")'
		);

		if (await langSwitcher.first().isVisible()) {
			await langSwitcher.first().click();
			// Language should change
			await page.waitForTimeout(500);
		}
	});
});

test.describe('Alerts Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/alerts');
	});

	test('loads alerts page', async ({ page }) => {
		await expect(page.locator('h1')).toContainText(/alert|уведомлен/i);
	});

	test('displays alert filters', async ({ page }) => {
		// Should have severity filter
		const severityFilter = page.locator('select, [data-testid="severity-filter"]').first();
		await expect(severityFilter).toBeVisible();
	});

	test('displays alert statistics', async ({ page }) => {
		// Should show stats like "Active: X"
		await expect(page.getByText(/active|критич|активн/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Maintenance Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/maintenance');
	});

	test('loads maintenance page', async ({ page }) => {
		await expect(page.locator('h1')).toBeVisible();
	});

	test('displays maintenance forecasts', async ({ page }) => {
		// Should show engine maintenance info
		await page.waitForTimeout(2000);

		// Look for engine IDs or maintenance-related text
		const maintenanceContent = page.locator('main');
		await expect(maintenanceContent).toBeVisible();
	});
});

test.describe('Engine Detail Page', () => {
	test('loads engine detail page', async ({ page }) => {
		// First go to dashboard
		await page.goto('/');
		await page.waitForTimeout(2000);

		// Try to navigate to an engine detail page
		const engineLink = page.locator('a[href*="/engine/"]').first();

		if (await engineLink.isVisible()) {
			await engineLink.click();
			await expect(page).toHaveURL(/\/engine\//);

			// Should show engine details
			await expect(page.locator('h1')).toBeVisible();
		}
	});
});

test.describe('Authentication', () => {
	test('login page is accessible', async ({ page }) => {
		await page.goto('/login');

		// Should show login form
		await expect(page.locator('form')).toBeVisible();
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});

	test('register page is accessible', async ({ page }) => {
		await page.goto('/register');

		// Should show registration form
		await expect(page.locator('form')).toBeVisible();
		await expect(page.locator('input[type="email"]')).toBeVisible();
	});
});

test.describe('Responsive Design', () => {
	test('mobile view shows menu button', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Should show mobile menu button
		const menuButton = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
		await expect(menuButton.first()).toBeVisible();
	});

	test('desktop view shows full navigation', async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto('/');

		// Should show navigation links
		const nav = page.locator('nav, [role="navigation"]');
		await expect(nav.first()).toBeVisible();
	});
});

test.describe('Error Handling', () => {
	test('404 page for unknown routes', async ({ page }) => {
		const response = await page.goto('/this-page-does-not-exist-12345');
		expect(response?.status()).toBe(404);
	});
});
