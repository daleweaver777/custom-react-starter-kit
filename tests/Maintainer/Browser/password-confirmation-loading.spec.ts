import { expect, test } from '@playwright/test';

for (const result of ['expired', 'rejected'] as const) {
    test(`confirmation recheck ${result} clears busy state and permits password recovery`, async ({
        page,
    }, info) => {
        const errors: string[] = [];
        let statusUrl = '';
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
            const expectedFailure =
                result === 'rejected' &&
                statusUrl !== '' &&
                message.type() === 'error' &&
                /422/.test(message.text()) &&
                message.location().url.endsWith(statusUrl);
            if (
                !expectedFailure &&
                (message.type() === 'error' ||
                    /hydration|hydrating|did not match|server rendered/i.test(
                        message.text(),
                    ))
            ) {
                errors.push(message.text());
            }
        });
        page.on('response', (response) => {
            if (response.status() >= 500) {
                errors.push(`${response.status()} ${response.url()}`);
            }
        });

        await page.goto('/login');
        await page
            .getByLabel('Email address', { exact: true })
            .fill(`confirmation-${result}-${info.project.name}@example.test`);
        await page
            .getByLabel('Password', { exact: true })
            .fill('Browser-test-password-9!');
        await page.locator('[data-test="login-button"]').click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await page.goto('/settings/profile');
        const { props } = JSON.parse(
            await page.locator('script[data-page="app"]').innerText(),
        );
        statusUrl = props.passwordConfirmation.statusUrl;
        expect(statusUrl).toBeTruthy();

        let requests = 0;
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });
        await page.route(`**${statusUrl}`, async (route) => {
            requests++;
            if (requests === 1) {
                // An always-confirm action still opens a dialog for a recently
                // confirmed account, then checks the status again on submit.
                await route.fulfill({ json: { confirmed: true } });
            } else if (requests === 2) {
                await pending;
                await route.fulfill(
                    result === 'rejected'
                        ? {
                              status: 422,
                              json: { message: 'Confirmation check rejected.' },
                          }
                        : { json: { confirmed: false } },
                );
            } else {
                await route.continue();
            }
        });

        try {
            await page.locator('[data-test="delete-user-button"]').click();
            const dialog = page.getByRole('dialog', {
                name: 'Delete account?',
            });
            const password = dialog.getByLabel('Current password', {
                exact: true,
            });
            const submit = dialog.getByRole('button', {
                name: 'Delete account',
                exact: true,
            });
            const cancel = dialog.getByRole('button', {
                name: 'Cancel',
                exact: true,
            });
            await expect(dialog).toBeVisible();
            await expect(password).toHaveCount(0);
            await submit.click();
            await expect.poll(() => requests).toBe(2);
            await expect(submit).toBeDisabled();
            await expect(cancel).toBeDisabled();

            release();
            await expect(password).toBeVisible();
            await expect(password).toBeEnabled();
            await expect(submit).toBeEnabled();
            await expect(cancel).toBeEnabled();
            if (result === 'rejected') {
                await expect(
                    dialog.getByText('Unable to confirm. Please try again.'),
                ).toBeVisible();
            }
            await password.fill('Browser-test-password-9!');
            await submit.click();
            await expect(dialog).toBeHidden();
            await expect(page).toHaveURL('/');
            expect(requests).toBe(3);
            expect(errors).toEqual([]);
        } finally {
            release();
            await page.unrouteAll({ behavior: 'wait' });
        }
    });
}
