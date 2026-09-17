import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const password = 'Browser-test-password-9!';
const injectedFailure = new WeakMap<Page, number>();
const features = () =>
    JSON.parse(
        readFileSync(
            path.join(
                process.env.STARTER_TEST_APP!,
                'storage/framework/testing/browser-features.json',
            ),
            'utf8',
        ),
    );

async function login(page: Page, browser: string) {
    await page.goto('/login');
    await page
        .getByLabel('Email address', { exact: true })
        .fill(`${browser}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        const injected = injectedFailure.get(page);
        const location = message.location().url;
        const injectedEndpoint = location
            ? new URL(location, page.url()).pathname === '/settings/profile'
            : injected === 0 ||
              message.text().includes(`status of ${injected}`);
        const expectedResourceError =
            injected !== undefined &&
            injectedEndpoint &&
            (/Failed to load resource/.test(message.text()) ||
                /NetworkError when attempting to fetch resource/.test(
                    message.text(),
                ));
        if (
            message.type() === 'error' &&
            !expectedResourceError &&
            !/status of (419|422)/.test(message.text())
        ) {
            errors.push(message.text());
        }
        if (
            /hydration|hydrating|did not match|server rendered/i.test(
                message.text(),
            )
        )
            errors.push(message.text());
    });
    page.on('response', (response) => {
        if (
            response.status() >= 500 &&
            !(
                injectedFailure.get(page) === response.status() &&
                new URL(response.url()).pathname === '/settings/profile'
            )
        )
            errors.push(`${response.status()} ${response.url()}`);
    });
    await page.exposeFunction('collectedBrowserErrors', () => errors);
});

test.afterAll(() => {
    const log = readFileSync(
        path.join(process.env.STARTER_TEST_APP!, 'storage/logs/laravel.log'),
        'utf8',
    );
    expect(
        log.match(/^\[.*\.(?:ERROR|CRITICAL|ALERT|EMERGENCY):.*$/gm) || [],
    ).toEqual([]);
});

test.afterEach(async ({ page }) => {
    if (!page.isClosed() && page.url() !== 'about:blank') {
        const errors = await page.evaluate(() =>
            (
                window as unknown as {
                    collectedBrowserErrors: () => Promise<string[]>;
                }
            ).collectedBrowserErrors(),
        );
        expect(errors).toEqual([]);
    }
});

test('guest pages render real HTML before hydration and match selected features', async ({
    page,
    request,
}) => {
    for (const [url, label] of [
        ['/login', 'Log in to your account'],
        ['/forgot-password', 'Forgot password'],
        ['/reset-password/browser-test-token', 'Reset password'],
    ]) {
        const response = await request.get(url);
        expect(response.ok()).toBeTruthy();
        const html = await response.text();
        expect(html).toContain('data-server-rendered');
        expect(html).toContain(label);
        await page.goto(url);
        await expect(
            page.getByRole('heading', { name: label, exact: true }),
        ).toBeVisible();
        if (url.startsWith('/reset-password/')) {
            await expect(
                page.getByLabel('Email address', { exact: true }),
            ).toHaveValue('');
        }
    }
    const response = await request.get('/register');
    if (features().registration) {
        expect(response.ok()).toBeTruthy();
        expect(await response.text()).toContain('data-server-rendered');
        await page.goto('/register');
        await expect(
            page.getByRole('heading', { name: 'Create an account' }),
        ).toBeVisible();
    } else {
        expect(response.status()).toBe(404);
        await page.goto('/login');
        await expect(page.getByRole('link', { name: 'Sign up' })).toHaveCount(
            0,
        );
    }
});

test('profile validation, delayed save, toast, and authenticated SSR', async ({
    page,
}, info) => {
    await login(page, info.project.name);
    await page.goto('/settings/profile');
    const response = await page.request.get('/settings/profile');
    expect(await response.text()).toContain('data-server-rendered');
    const name = page.getByLabel('Name', { exact: true });
    const save = page.locator('[data-test="update-profile-button"]');
    await name.fill('');
    await save.click();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toBeFocused();
    await name.fill('Updated Browser Test');
    await page.route('**/settings/profile*', async (route) => {
        if (route.request().method() !== 'GET')
            await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.continue();
    });
    const before = await save.boundingBox();
    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).toHaveAttribute('data-loading');
    const during = await save.boundingBox();
    expect(during?.width).toBe(before?.width);
    expect(during?.height).toBe(before?.height);
    await expect(save).toBeEnabled();
    await expect(
        page.getByText('Profile updated', { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(name).toHaveValue('Updated Browser Test');
    await name.fill('Browser Test');
    await save.click();
    await expect(
        page.getByText('Profile updated', { exact: false }),
    ).toBeVisible();
    await page.screenshot({
        path: info.outputPath('profile-light.png'),
        fullPage: true,
    });
});

test('email change requires confirmation, handles errors and cancellation', async ({
    page,
}, info) => {
    await login(page, info.project.name);
    await page.goto('/settings/profile');
    const send = page.getByRole('button', { name: 'Send verification link' });
    await page
        .getByLabel('New email address', { exact: true })
        .fill(`${info.project.name}-changed@example.test`);
    await send.click();
    const dialog = page.getByRole('dialog', { name: 'Confirm your identity' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(send).toBeFocused();
    await send.click();
    await dialog
        .getByLabel('Current password', { exact: true })
        .fill('incorrect');
    await dialog.getByRole('button', { name: 'Confirm and continue' }).click();
    await expect(dialog.getByText('The password is incorrect.')).toBeVisible();
    await dialog.getByLabel('Current password', { exact: true }).fill(password);
    await dialog.getByRole('button', { name: 'Confirm and continue' }).click();
    await expect(dialog).toBeHidden();
    await expect(
        page.getByRole('button', { name: 'Cancel email change' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel email change' }).click();
    await expect(
        page.getByLabel('New email address', { exact: true }),
    ).toBeVisible();
    const cancellationToast = page.getByRole('dialog', {
        name: 'Email change cancelled.',
        exact: true,
    });
    await expect(cancellationToast).toBeVisible();
    await cancellationToast.evaluate(
        () =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => resolve());
                });
            }),
    );
    await expect
        .poll(() =>
            cancellationToast.evaluate(
                (element) =>
                    element
                        .getAnimations()
                        .filter(
                            (animation) => animation.playState === 'running',
                        ).length,
            ),
        )
        .toBe(0);
});

test('mandatory security controls survive and confirmation cancellation is safe', async ({
    page,
}, info) => {
    await login(page, info.project.name);
    await page.goto('/settings/security');
    await expect(
        page.getByRole('button', { name: 'Enable 2FA' }),
    ).toBeVisible();
    await expect(page.getByText('Passkeys', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Enable 2FA' }).click();
    const dialog = page.getByRole('dialog', { name: 'Confirm your identity' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(
        page.getByRole('button', { name: 'Enable 2FA' }),
    ).toBeFocused();
    await page.screenshot({
        path: info.outputPath('security-light.png'),
        fullPage: true,
    });
});

test('themes, responsive layout, and keyboard focus remain usable', async ({
    page,
}, info) => {
    await login(page, info.project.name);
    await page.goto('/settings/appearance');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.goto('/settings/profile');
    await page.screenshot({
        path: info.outputPath('profile-dark.png'),
        fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
        path: info.outputPath('profile-mobile.png'),
        fullPage: true,
    });
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBeTruthy();
    await page.getByLabel('Name', { exact: true }).focus();
    expect(
        await page
            .getByLabel('Name', { exact: true })
            .evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe('solid');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
});

test('session, throttle, server, and network failures recover without blocking the form', async ({
    page,
}, info) => {
    await login(page, info.project.name);
    await page.goto('/settings/profile');
    await page.getByLabel('Name', { exact: true }).fill('Expired request');
    const save = page.locator('[data-test="update-profile-button"]');
    for (const [status, title] of [
        [419, 'Session expired'],
        [429, 'Too many requests'],
        [500, 'Something went wrong'],
        [0, 'Connection problem'],
    ] as const) {
        injectedFailure.set(page, status);
        await page.route('**/settings/profile*', async (route) => {
            if (route.request().method() === 'GET') return route.continue();
            if (status === 0) return route.abort('failed');
            await route.fulfill({
                status,
                contentType: 'application/json',
                body: JSON.stringify({ message: title }),
            });
        });
        await save.click();
        await expect(page.getByText(title, { exact: true })).toBeVisible();
        if (status === 419)
            await expect(
                page.getByRole('button', { name: 'Refresh' }),
            ).toBeVisible();
        await expect(save).toBeEnabled();
        await page
            .getByRole('button', { name: 'Dismiss notification' })
            .click();
        await expect(page.getByText(title, { exact: true })).toBeHidden();
        await page.unroute('**/settings/profile*');
        injectedFailure.delete(page);
    }
    await save.click();
    await expect(
        page.getByText('Profile updated', { exact: false }),
    ).toBeVisible();
});
