import { expect, test, type Page } from '@playwright/test';
import { authenticationCode } from './totp';

const setupRequestPattern = /\/user\/two-factor-(?:qr-code|secret-key)$/;
const setupDialogName = 'Enable two-factor authentication';

function watchBrowserErrors(page: Page, expectedFailure?: RegExp) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        const injectedFailure =
            message.type() === 'error' &&
            /403/.test(message.text()) &&
            expectedFailure?.test(message.location().url);
        if (
            !injectedFailure &&
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
    return errors;
}

async function openSetup(page: Page, needsPassword = false) {
    await page.getByRole('button', { name: 'Enable 2FA', exact: true }).click();
    const confirmation = page.getByRole('dialog', {
        name: 'Confirm your identity',
    });
    if (needsPassword) {
        await expect(confirmation).toBeVisible();
        await confirmation
            .getByLabel('Current password', { exact: true })
            .fill('Browser-test-password-9!');
        await confirmation
            .getByRole('button', { name: 'Confirm and continue' })
            .click();
    }
    await expect(
        page.getByRole('dialog', { name: setupDialogName }),
    ).toBeVisible();
}

for (const obsoleteResult of ['success', 'failure'] as const) {
    test(`reopening 2FA setup ignores obsolete ${obsoleteResult} responses`, async ({
        page,
    }, info) => {
        const browserErrors = watchBrowserErrors(
            page,
            obsoleteResult === 'failure' ? setupRequestPattern : undefined,
        );

        await page.goto('/login');
        await page
            .getByLabel('Email address', { exact: true })
            .fill(
                `twofactor-race-${obsoleteResult}-${info.project.name}@example.test`,
            );
        await page
            .getByLabel('Password', { exact: true })
            .fill('Browser-test-password-9!');
        await page.locator('[data-test="login-button"]').click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await page.goto('/settings/security');

        let release!: () => void;
        const heldResponses = new Promise<void>((resolve) => {
            release = resolve;
        });
        let setupRequests = 0;
        let obsoleteResponsesFinished = 0;
        page.on('requestfinished', (request) => {
            if (setupRequestPattern.test(request.url())) {
                obsoleteResponsesFinished++;
            }
        });
        await page.route(setupRequestPattern, async (route) => {
            setupRequests++;
            if (setupRequests > 2) {
                await route.continue();
                return;
            }

            await heldResponses;
            if (obsoleteResult === 'failure') {
                await route.fulfill({
                    status: 403,
                    json: { message: 'Obsolete setup request failed.' },
                });
            } else {
                await route.fulfill({
                    json: route.request().url().endsWith('secret-key')
                        ? { secretKey: 'OBSOLETESETUPKEY' }
                        : {
                              svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><title>Obsolete QR code</title></svg>',
                              url: 'otpauth://totp/obsolete',
                          },
                });
            }
        });

        try {
            await openSetup(page, true);
            await expect.poll(() => setupRequests).toBe(2);
            const setup = page.getByRole('dialog', { name: setupDialogName });
            const key = setup.getByLabel('Two-factor authentication setup key');
            const qr = setup.getByRole('img', {
                name: 'QR code for setting up two-factor authentication',
            });
            const continueButton = setup.getByRole('button', {
                name: 'Continue',
                exact: true,
            });
            await expect(key).toHaveValue('');
            await expect(continueButton).toBeDisabled();
            await setup
                .getByRole('button', { name: 'Close', exact: true })
                .click();
            await expect(setup).toBeHidden();

            await openSetup(page);
            // Reopening must start a new pair while the first pair is still pending.
            await expect.poll(() => setupRequests).toBe(4);
            await expect(key).not.toHaveValue('');
            await expect(qr).toBeVisible();
            await expect(continueButton).toBeEnabled();
            const freshKey = await key.inputValue();
            const freshQr = await qr.getAttribute('src');
            expect(freshKey).not.toBe('OBSOLETESETUPKEY');

            release();
            await expect.poll(() => obsoleteResponsesFinished).toBe(4);
            // Let network callbacks and React's resulting commits reach the DOM.
            await page.evaluate(
                () =>
                    new Promise<void>((resolve) => {
                        requestAnimationFrame(() =>
                            requestAnimationFrame(() => resolve()),
                        );
                    }),
            );
            await expect(key).toHaveValue(freshKey);
            await expect(qr).toHaveAttribute('src', freshQr!);
            await expect(continueButton).toBeEnabled();
            await expect(
                page.getByText(/Unable to load the (?:QR code|setup key)/),
            ).toHaveCount(0);
            expect(browserErrors).toEqual([]);
        } finally {
            release();
            await page.unrouteAll({ behavior: 'wait' });
        }
    });
}

test('confirmation expiry discards a pending recovery-code failure and permits a fresh request', async ({
    page,
}, info) => {
    const browserErrors = watchBrowserErrors(
        page,
        /\/user\/two-factor-recovery-codes$/,
    );
    await page.clock.install();
    await page.goto('/login');
    await page
        .getByLabel('Email address', { exact: true })
        .fill(`twofactor-expiry-${info.project.name}@example.test`);
    await page
        .getByLabel('Password', { exact: true })
        .fill('Browser-test-password-9!');
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/settings/security');
    await openSetup(page, true);
    const setup = page.getByRole('dialog', { name: setupDialogName });
    const key = setup.getByLabel('Two-factor authentication setup key');
    await expect(key).not.toHaveValue('');
    const code = authenticationCode(await key.inputValue());
    await setup.getByRole('button', { name: 'Continue', exact: true }).click();
    const verification = page.getByRole('dialog', {
        name: 'Verify authentication code',
    });
    await verification
        .getByLabel('Authentication code', { exact: true })
        .fill(code);
    await verification
        .getByRole('button', { name: 'Confirm', exact: true })
        .click();
    await expect(verification).toBeHidden();
    await expect(
        page.getByRole('button', { name: 'Disable 2FA', exact: true }),
    ).toBeVisible();

    const { props } = JSON.parse(
        await page.locator('script[data-page="app"]').innerText(),
    );
    const expiryMilliseconds = (props.passwordConfirmation.timeout + 1) * 1000;
    expect(expiryMilliseconds).toBeGreaterThan(1000);
    const codes = page.getByRole('list', { name: 'Recovery codes' });
    const viewCodes = page.getByRole('button', { name: 'View recovery codes' });
    let requests = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/user/two-factor-recovery-codes', async (route) => {
        requests++;
        if (requests > 1) {
            await route.continue();
            return;
        }
        await pending;
        await route.fulfill({
            status: 403,
            json: { message: 'Obsolete recovery-code request failed.' },
        });
    });
    try {
        await viewCodes.click();
        await expect.poll(() => requests).toBe(1);
        await page.clock.fastForward(expiryMilliseconds);
        await expect(codes).toHaveCount(0);
        release();
        await expect(viewCodes).toBeEnabled();
        await expect(
            page.getByText('Unable to load recovery codes. Please try again.'),
        ).toHaveCount(0);
        await expect(codes).toHaveCount(0);

        // The server can expire confirmation independently of the browser timer.
        // Exercise the real password prompt before fetching replacement codes.
        await page.route(
            `**${props.passwordConfirmation.statusUrl}`,
            async (route) => {
                await route.fulfill({ json: { confirmed: false } });
                await page.unroute(`**${props.passwordConfirmation.statusUrl}`);
            },
        );
        await viewCodes.click();
        const confirmation = page.getByRole('dialog', {
            name: 'Confirm your identity',
        });
        await expect(confirmation).toBeVisible();
        await confirmation
            .getByLabel('Current password', { exact: true })
            .fill('Browser-test-password-9!');
        await confirmation
            .getByRole('button', { name: 'Confirm and continue' })
            .click();
        await expect(confirmation).toBeHidden();
        await expect(codes.getByRole('listitem')).toHaveCount(8);
        await page.clock.fastForward(expiryMilliseconds);
        await expect(codes).toHaveCount(0);
        expect(browserErrors).toEqual([]);
    } finally {
        release();
        await page.unrouteAll({ behavior: 'wait' });
    }
});

test('confirmation expiry clears setup secrets and permits setup after reauthentication', async ({
    page,
}, info) => {
    const browserErrors = watchBrowserErrors(page);
    await page.clock.install();
    await page.goto('/login');
    await page
        .getByLabel('Email address', { exact: true })
        .fill(`twofactor-setup-expiry-${info.project.name}@example.test`);
    await page
        .getByLabel('Password', { exact: true })
        .fill('Browser-test-password-9!');
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/settings/security');
    const { props } = JSON.parse(
        await page.locator('script[data-page="app"]').innerText(),
    );
    let setupRequests = 0;
    page.on('request', (request) => {
        if (setupRequestPattern.test(request.url())) setupRequests++;
    });
    await openSetup(page, true);
    const setup = page.getByRole('dialog', { name: setupDialogName });
    const key = page.getByLabel('Two-factor authentication setup key');
    const qr = page.getByRole('img', {
        name: 'QR code for setting up two-factor authentication',
    });
    await expect(key).not.toHaveValue('');
    await expect(qr).toBeVisible();
    await expect.poll(() => setupRequests).toBe(2);
    await page.clock.fastForward(
        (props.passwordConfirmation.timeout + 1) * 1000,
    );
    await expect(setup).toBeHidden();
    await expect(key).toHaveCount(0);
    await expect(qr).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'Continue setup', exact: true }),
    ).toHaveCount(0);
    // Keep later real server deadlines comparable with browser time. The
    // fast-forward above advances browser timers, not PHP's wall clock.
    await page.clock.setSystemTime(Date.now());

    // Browser time and server time are independent. Simulate the server also
    // expiring confirmation, then use the real password confirmation endpoint.
    const statusPattern = `**${props.passwordConfirmation.statusUrl}`;
    await page.route(statusPattern, async (route) => {
        await route.fulfill({ json: { confirmed: false } });
        await page.unroute(statusPattern);
    });
    await openSetup(page, true);
    await expect.poll(() => setupRequests).toBe(4);
    await expect(key).not.toHaveValue('');
    await expect(qr).toBeVisible();
    await expect(
        setup.getByRole('button', { name: 'Continue', exact: true }),
    ).toBeEnabled();
    await setup.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(key).toHaveCount(0);
    expect(browserErrors).toEqual([]);
});

test('server confirmation deadlines replace local status only when the server value changes', async ({
    page,
}, info) => {
    const browserErrors = watchBrowserErrors(page);
    await page.clock.install();
    await page.goto('/login');
    await page
        .getByLabel('Email address', { exact: true })
        .fill(`twofactor-policy-${info.project.name}@example.test`);
    await page
        .getByLabel('Password', { exact: true })
        .fill('Browser-test-password-9!');
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/settings/security');

    let serverDeadline = 0;
    let policyResponses = 0;
    await page.route('**/settings/password*', async (route) => {
        if (!route.request().headers()['x-inertia']) {
            await route.continue();
            return;
        }
        const response = await route.fetch();
        const payload = await response.json();
        payload.props.passwordConfirmation.confirmedUntil = serverDeadline;
        policyResponses++;
        await route.fulfill({ response, json: payload });
    });
    await openSetup(page, true);
    const setup = page.getByRole('dialog', { name: setupDialogName });
    const key = setup.getByLabel('Two-factor authentication setup key');
    await expect(key).not.toHaveValue('');
    const code = authenticationCode(await key.inputValue());
    await setup.getByRole('button', { name: 'Continue', exact: true }).click();
    const verification = page.getByRole('dialog', {
        name: 'Verify authentication code',
    });
    await verification
        .getByLabel('Authentication code', { exact: true })
        .fill(code);
    await verification
        .getByRole('button', { name: 'Confirm', exact: true })
        .click();
    await expect(verification).toBeHidden();
    const codes = page.getByRole('list', { name: 'Recovery codes' });
    const viewCodes = page.getByRole('button', { name: 'View recovery codes' });
    const refreshPolicy = async () => {
        const previousResponses = policyResponses;
        // Validation redirects preserve the current component state, allowing
        // the changed server prop to be tested without a page remount.
        await page
            .getByLabel('Current password', { exact: true })
            .fill('incorrect-password');
        await page
            .getByLabel('New password', { exact: true })
            .fill('Another-browser-password-8!');
        await page
            .getByLabel('Confirm password', { exact: true })
            .fill('Another-browser-password-8!');
        await page.locator('[data-test="update-password-button"]').click();
        await expect.poll(() => policyResponses).toBe(previousResponses + 1);
        await expect(page.locator('#current_password')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    };

    // Establish server value A, then allow the status endpoint to refresh the
    // local expiry. Another response with the same A must preserve that expiry.
    await refreshPolicy();
    await viewCodes.click();
    await expect(codes.getByRole('listitem')).toHaveCount(8);
    const originalCodes = await codes.getByRole('listitem').allTextContents();
    await refreshPolicy();
    await expect(codes.getByRole('listitem')).toHaveText(originalCodes);

    serverDeadline = await page.evaluate(() => Date.now() + 10_000);
    await refreshPolicy();
    await expect(codes.getByRole('listitem')).toHaveText(originalCodes);
    await page.clock.fastForward(10_001);
    await expect(codes).toHaveCount(0);

    // A fresh status response can extend confirmation locally. Reverting from
    // server value B to A must clear codes, never resurrect A's old local expiry.
    await viewCodes.click();
    await expect(codes.getByRole('listitem')).toHaveCount(8);
    serverDeadline = 0;
    await refreshPolicy();
    await expect(codes).toHaveCount(0);
    for (const code of originalCodes) {
        await expect(page.getByText(code, { exact: true })).toHaveCount(0);
    }
    expect(browserErrors).toEqual([]);
});
