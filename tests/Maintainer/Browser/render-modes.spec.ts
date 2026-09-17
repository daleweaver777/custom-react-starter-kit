import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test('rendering mode and profile edits survive hydration, reset, and pending saves', async ({
    page,
}, info) => {
    test.setTimeout(90_000);
    const ssr = process.env.STARTER_TEST_RENDER_MODE === 'development-ssr';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (
            message.type() === 'error' ||
            /hydration|hydrating|did not match|server rendered/i.test(
                message.text(),
            )
        ) {
            errors.push(message.text());
        }
    });
    page.on('response', (response) => {
        if (response.status() >= 500)
            errors.push(`${response.status()} ${response.url()}`);
    });

    let html = '';
    // Inertia deliberately serves CSR while Vite warms its SSR module graph.
    await expect
        .poll(
            async () => {
                const response = await page.request.get('/login');
                expect(response.status()).toBe(200);
                html = await response.text();
                return html.includes('data-server-rendered');
            },
            { timeout: 60_000 },
        )
        .toBe(ssr);
    expect(html.includes('Log in to your account')).toBe(ssr);
    expect(html.includes('@vite/client')).toBe(ssr);

    await page.goto('/login');
    await expect(
        page.getByRole('heading', {
            name: 'Log in to your account',
            exact: true,
        }),
    ).toBeVisible();
    await page
        .getByLabel('Email address', { exact: true })
        .fill(`${info.project.name}@example.test`);
    await page
        .getByLabel('Password', { exact: true })
        .fill('Browser-test-password-9!');
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/settings/profile');
    const response = await page.request.get('/settings/profile');
    expect(response.status()).toBe(200);
    expect((await response.text()).includes('data-server-rendered')).toBe(ssr);

    const name = page.getByLabel('Name', { exact: true });
    const save = page.locator('[data-test="update-profile-button"]');
    const initialName = await name.inputValue();
    await name.fill('Rendering regression');
    await save.click();
    await expect(
        page.getByText('Profile updated.', { exact: true }),
    ).toBeVisible();
    await expect(name).toHaveValue('Rendering regression');
    await name.evaluate((input) => (input as HTMLInputElement).form!.reset());
    await expect(name).toHaveValue(initialName);
    await page.goto('/settings/appearance');
    await page.goto('/settings/profile');
    await expect(name).toHaveValue('Rendering regression');

    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/settings/profile*', async (route) => {
        if (route.request().method() !== 'GET') await pending;
        await route.continue();
    });
    await name.fill('Saved before another edit');
    await save.click();
    await expect(save).toBeDisabled();
    try {
        await name.fill('Unsaved while waiting');
    } finally {
        release();
    }
    await expect(save).toBeEnabled();
    await expect(name).toHaveValue('Unsaved while waiting');
    await page.reload();
    await expect(name).toHaveValue('Saved before another edit');

    expect(errors).toEqual([]);
    const log = readFileSync(
        path.join(process.env.STARTER_TEST_APP!, 'storage/logs/laravel.log'),
        'utf8',
    );
    expect(
        log.match(/^\[.*\.(?:ERROR|CRITICAL|ALERT|EMERGENCY):.*$/gm) || [],
    ).toEqual([]);
    const evidence = info.outputPath('render-mode.json');
    writeFileSync(
        evidence,
        JSON.stringify({
            mode: process.env.STARTER_TEST_RENDER_MODE,
            guestSsr: ssr,
            authenticatedSsr: ssr,
            profileResetAndPendingEdits: 'passed',
            browserErrors: errors,
            serverErrors: [],
        }),
    );
    await info.attach('render-mode', {
        path: evidence,
        contentType: 'application/json',
    });
});
