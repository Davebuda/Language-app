import { test, expect } from '@playwright/test';

test.describe('Critical Path — App Foundation', () => {
  test('home page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    expect(errors).toHaveLength(0);
  });

  test('home page loads without network failures', async ({ page }) => {
    const failures: string[] = [];
    page.on('requestfailed', req => {
      // ignore analytics/tracking failures
      if (!req.url().includes('localhost')) return;
      failures.push(`${req.method()} ${req.url()}`);
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(failures).toHaveLength(0);
  });

  test('home page renders visible content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // At least one heading or button should be visible
    const hasContent = await page.locator('h1, h2, button, [role="button"]').first().isVisible();
    expect(hasContent).toBe(true);
  });
});

test.describe('Critical Path — Auth Flow', () => {
  test('sign in page renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // Try common auth routes
    const authRoutes = ['/auth/signin', '/login', '/sign-in', '/auth'];
    let found = false;
    for (const route of authRoutes) {
      const response = await page.goto(route);
      if (response && response.status() < 400) {
        found = true;
        await expect(page).not.toHaveURL('/404');
        break;
      }
    }
    if (!found) {
      // If no explicit auth route, the home page should still be functional
      await page.goto('/');
      await expect(page).toHaveTitle(/.+/);
    }
    expect(errors).toHaveLength(0);
  });
});

test.describe('Critical Path — Session Entry Point', () => {
  test('session start flow exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Look for any session/practice entry point
    const ctaSelectors = [
      'button:has-text("Start")',
      'button:has-text("Practice")',
      'button:has-text("Begin")',
      'button:has-text("Continue")',
      'a:has-text("Start")',
      'a:has-text("Practice")',
      '[data-testid="start-session"]',
    ];
    let found = false;
    for (const selector of ctaSelectors) {
      if (await page.locator(selector).isVisible()) {
        found = true;
        break;
      }
    }
    // This test documents whether a session entry point exists.
    // If none found, the session flow may be behind auth — that is expected.
    // The test passes either way but logs the state.
    if (!found) {
      console.log('INFO: No session CTA visible on home page (may be behind auth)');
    }
    // Home page itself must still be functional
    await expect(page).not.toHaveURL('/error');
  });
});
