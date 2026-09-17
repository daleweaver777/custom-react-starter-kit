import { defineConfig, devices } from '@playwright/test';
import { mkdirSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

const directory = process.env.STARTER_TEST_APP;
if (!directory)
    throw new Error(
        'Set STARTER_TEST_APP to a disposable installed application.',
    );
const app = realpathSync(directory);
if (app === realpathSync(path.resolve(testDirectory, '../../..'))) {
    throw new Error('Browser tests must not use the maintained checkout.');
}
const testingDirectory = path.join(app, 'storage/framework/testing');
const port = process.env.STARTER_TEST_PORT || '8125';
const origin = `http://localhost:${port}`;
const mode = process.env.STARTER_TEST_RENDER_MODE || 'production-ssr';
if (!['production-ssr', 'development-ssr', 'production-csr'].includes(mode)) {
    throw new Error('Unknown STARTER_TEST_RENDER_MODE.');
}
const development = mode === 'development-ssr';
const vitePort = process.env.STARTER_TEST_VITE_PORT || '5179';
if (mode === 'production-csr')
    rmSync(path.join(app, 'public/hot'), { force: true });
const firefoxEnvironment = { ...process.env };
if (process.platform === 'darwin') {
    // Keep Firefox's macOS app data inside the disposable test application.
    for (const key of ['MOZ_APP_DATA', 'MOZ_LOCAL_APP_DATA']) {
        const directory = path.join(testingDirectory, 'browser-runtime', key);
        mkdirSync(directory, { recursive: true });
        firefoxEnvironment[key] = directory;
    }
}
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const environment = {
    NO_COLOR: undefined,
    APP_ENV: development ? 'local' : 'production',
    APP_DEBUG: 'false',
    APP_URL: origin,
    APP_CONFIG_CACHE: path.join(app, 'bootstrap/cache/browser-config.php'),
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: path.join(app, 'database/browser.sqlite'),
    DB_URL: '',
    SESSION_DRIVER: 'file',
    CACHE_STORE: 'file',
    MAIL_MAILER: 'log',
    QUEUE_CONNECTION: 'sync',
    INERTIA_SSR_ENABLED: mode === 'production-csr' ? 'false' : 'true',
    INERTIA_SSR_THROW_ON_ERROR: 'true',
};

export default defineConfig({
    testDir: testDirectory,
    testMatch: mode === 'production-ssr' ? '*.spec.ts' : 'render-modes.spec.ts',
    testIgnore: mode === 'production-ssr' ? 'render-modes.spec.ts' : [],
    workers: 1,
    retries: 0,
    timeout: 45_000,
    expect: { timeout: 10_000 },
    outputDir:
        process.env.STARTER_BROWSER_OUTPUT ||
        path.join(testingDirectory, 'browser-results'),
    reporter: [['list']],
    use: {
        baseURL: origin,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        viewport: { width: 1440, height: 1000 },
    },
    projects:
        mode !== 'production-ssr'
            ? [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
            : [
                  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
                  {
                      name: 'firefox',
                      use: {
                          ...devices['Desktop Firefox'],
                          launchOptions: { env: firefoxEnvironment },
                      },
                  },
                  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
              ],
    webServer: [
        {
            command: `php ${quote(path.join(testDirectory, 'prepare.php'))} ${quote(app)} && php artisan serve --host=127.0.0.1 --port=${port} --no-reload`,
            cwd: app,
            env: environment,
            url: origin + '/up',
            reuseExistingServer: false,
            timeout: 60_000,
        },
        ...(mode === 'production-csr'
            ? []
            : [
                  {
                      command: development
                          ? `npm run dev -- --host=127.0.0.1 --port=${vitePort} --strictPort`
                          : 'php artisan inertia:start-ssr',
                      cwd: app,
                      env: environment,
                      url: development
                          ? `http://127.0.0.1:${vitePort}/@vite/client`
                          : 'http://127.0.0.1:13714/health',
                      reuseExistingServer: false,
                      timeout: 60_000,
                  },
              ]),
    ],
});
