import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { authenticationCode } from './totp';

const password = 'Browser-test-password-9!';

async function login(page: Page, email: string) {
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

async function logout(page: Page) {
    await page.locator('[data-test="sidebar-menu-button"]').click();
    await page.locator('[data-test="logout-button"]').click();
    await expect(page).not.toHaveURL(/\/settings\//);
    await page.goto('/login');
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
}

async function confirmPassword(page: Page) {
    const dialog = page.getByRole('dialog', { name: 'Confirm your identity' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Current password', { exact: true }).fill(password);
    await dialog.getByRole('button', { name: 'Confirm and continue' }).click();
    await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
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
        if (response.status() >= 500) {
            errors.push(`${response.status()} ${response.url()}`);
        }
    });
    await page.exposeFunction('securityBrowserErrors', () => errors);
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
    if (page.isClosed() || page.url() === 'about:blank') return;
    const errors = await page.evaluate(() =>
        (
            window as unknown as {
                securityBrowserErrors: () => Promise<string[]>;
            }
        ).securityBrowserErrors(),
    );
    expect(errors).toEqual([]);
});

test('real TOTP setup, recovery-code secrecy, and disabling work', async ({
    page,
}, info) => {
    await login(page, `twofactor-${info.project.name}@example.test`);
    await page.goto('/settings/security');
    await page.getByRole('button', { name: 'Enable 2FA', exact: true }).click();
    await confirmPassword(page);

    const setup = page.getByRole('dialog', {
        name: 'Enable two-factor authentication',
    });
    await expect(setup).toBeVisible();
    const key = setup.getByLabel('Two-factor authentication setup key');
    await expect(key).not.toHaveValue('');
    const secret = await key.inputValue();
    await expect(
        setup.getByRole('img', {
            name: 'QR code for setting up two-factor authentication',
        }),
    ).toBeVisible();
    await setup.getByRole('button', { name: 'Continue', exact: true }).click();
    const verification = page.getByRole('dialog', {
        name: 'Verify authentication code',
    });
    await verification
        .getByLabel('Authentication code', { exact: true })
        .fill(authenticationCode(secret));
    await verification
        .getByRole('button', { name: 'Confirm', exact: true })
        .click();
    await expect(verification).toBeHidden();
    await expect(
        page.getByRole('button', { name: 'Disable 2FA', exact: true }),
    ).toBeVisible();

    const codes = page.getByRole('list', { name: 'Recovery codes' });
    await expect(codes).toHaveCount(0);
    await page.getByRole('button', { name: 'View recovery codes' }).click();
    await expect(codes.getByRole('listitem')).toHaveCount(8);
    const firstCodes = await codes.getByRole('listitem').allTextContents();
    expect(new Set(firstCodes).size).toBe(8);
    await page.getByRole('button', { name: 'Hide recovery codes' }).click();
    await expect(codes).toHaveCount(0);
    for (const code of firstCodes) {
        await expect(page.getByText(code, { exact: true })).toHaveCount(0);
    }

    await page.getByRole('button', { name: 'View recovery codes' }).click();
    await expect(codes.getByRole('listitem')).toHaveText(firstCodes);
    await page
        .getByRole('button', { name: 'Regenerate codes', exact: true })
        .click();
    const regenerate = page.getByRole('dialog', {
        name: 'Regenerate recovery codes?',
    });
    await regenerate
        .getByRole('button', { name: 'Regenerate', exact: true })
        .click();
    await expect(regenerate).toBeHidden();
    await expect(codes.getByRole('listitem')).toHaveCount(8);
    await expect(codes.getByRole('listitem').first()).not.toHaveText(
        firstCodes[0],
    );

    await page
        .getByRole('button', { name: 'Disable 2FA', exact: true })
        .click();
    const disable = page.getByRole('dialog', { name: 'Disable 2FA?' });
    await disable.getByRole('button', { name: 'Disable', exact: true }).click();
    await expect(disable).toBeHidden();
    await expect(
        page.getByRole('button', { name: 'Enable 2FA', exact: true }),
    ).toBeVisible();
    await expect(codes).toHaveCount(0);
    await page.reload();
    await expect(
        page.getByRole('button', { name: 'Enable 2FA', exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText('2FA recovery codes', { exact: true }),
    ).toHaveCount(0);
});

test('virtual WebAuthn enrollment, login, identity confirmation, and deletion work', async ({
    page,
    context,
    browserName,
}, info) => {
    test.skip(
        browserName !== 'chromium',
        'Playwright virtual WebAuthn uses Chromium CDP; physical-device verification remains separate.',
    );
    const client = await context.newCDPSession(page);
    await client.send('WebAuthn.enable');
    const { authenticatorId } = await client.send(
        'WebAuthn.addVirtualAuthenticator',
        {
            options: {
                protocol: 'ctap2',
                transport: 'internal',
                hasResidentKey: true,
                hasUserVerification: true,
                isUserVerified: true,
                automaticPresenceSimulation: true,
            },
        },
    );
    try {
        await login(page, `passkey-${info.project.name}@example.test`);
        await page.goto('/settings/security');
        await page.getByRole('button', { name: 'Add passkey' }).click();
        await page
            .getByLabel('Passkey name', { exact: true })
            .fill('Browser test passkey');
        await page.getByRole('button', { name: 'Register passkey' }).click();
        await confirmPassword(page);
        await expect(
            page.getByText('Browser test passkey', { exact: true }),
        ).toBeVisible();
        const registered = await client.send('WebAuthn.getCredentials', {
            authenticatorId,
        });
        expect(registered.credentials).toHaveLength(1);

        await logout(page);
        await page
            .getByRole('button', { name: 'Sign in with a passkey' })
            .click();
        await expect(page).toHaveURL(/\/dashboard$/);
        const authenticated = await client.send('WebAuthn.getCredentials', {
            authenticatorId,
        });
        expect(authenticated.credentials[0].signCount).toBeGreaterThan(
            registered.credentials[0].signCount,
        );

        // A new password-login session has no recent action confirmation.
        await logout(page);
        await login(page, `passkey-${info.project.name}@example.test`);
        await page.goto('/settings/security');
        await page
            .getByRole('button', {
                name: 'Remove Browser test passkey',
                exact: true,
            })
            .click();
        const remove = page.getByRole('dialog', { name: 'Remove passkey?' });
        await expect(
            remove.getByRole('button', { name: 'Confirm with passkey' }),
        ).toBeVisible();
        await remove
            .getByRole('button', { name: 'Confirm with passkey' })
            .click();
        await expect(remove).toBeHidden();
        await expect(
            page.getByText('Browser test passkey', { exact: true }),
        ).toHaveCount(0);
        await expect(
            page.getByText('No passkeys yet', { exact: true }),
        ).toBeVisible();
        const confirmed = await client.send('WebAuthn.getCredentials', {
            authenticatorId,
        });
        expect(confirmed.credentials[0].signCount).toBeGreaterThan(
            authenticated.credentials[0].signCount,
        );
        await page.reload();
        await expect(
            page.getByText('No passkeys yet', { exact: true }),
        ).toBeVisible();
    } finally {
        await client.send('WebAuthn.removeVirtualAuthenticator', {
            authenticatorId,
        });
        await client.detach();
    }
});
