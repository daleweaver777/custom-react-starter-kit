<?php

namespace Tests\Unit;

use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Process\Process;

class ChiselFeatureCleanupTest extends TestCase
{
    public static function featureSelections(): array
    {
        $features = ['email-verification', 'registration', '2fa', 'passkeys', 'password-confirmation'];
        $selections = [];

        for ($mask = 0; $mask < 1 << count($features); $mask++) {
            $selected = array_values(array_filter(
                $features,
                fn (int $bit): bool => (bool) ($mask & (1 << $bit)),
                ARRAY_FILTER_USE_KEY,
            ));
            $selections[implode(', ', $selected) ?: 'none'] = [$selected];
        }

        return $selections;
    }

    #[DataProvider('featureSelections')]
    public function test_chisel_removes_unselected_feature_code(array $features): void
    {
        $confirmation = in_array('password-confirmation', $features, true);
        $passkeys = in_array('passkeys', $features, true);
        $twoFactor = in_array('2fa', $features, true);
        $registration = in_array('registration', $features, true);
        $verification = in_array('email-verification', $features, true);
        if (PHP_OS_FAMILY === 'Windows') {
            $this->markTestSkipped('The isolated command stubs require a POSIX shell.');
        }

        $root = dirname(__DIR__, 2);
        $directory = sys_get_temp_dir().'/chisel-cleanup-'.bin2hex(random_bytes(8));
        $filesystem = new Filesystem;
        $filesystem->ensureDirectoryExists($directory.'/bin');

        try {
            $files = Finder::create()->files()->in(array_map(
                fn (string $path) => $root.'/'.$path,
                ['app', 'bootstrap', 'config', 'database', 'resources', 'routes', 'tests'],
            ))->name(['*.php', '*.tsx', '*.ts', '*.css'])->exclude(['cache', 'ssr']);

            foreach ($files as $file) {
                $relative = substr($file->getPathname(), strlen($root) + 1);
                if (preg_match('#^resources/js/(actions|routes|wayfinder)/#', $relative)) {
                    continue;
                }
                $filesystem->ensureDirectoryExists(dirname($directory.'/'.$relative));
                $filesystem->copy($file->getPathname(), $directory.'/'.$relative);
            }

            foreach (['chisel.php', 'chisel-paths.php', 'composer.json', 'package.json', 'README.md', 'README-maintainer.md', 'AGENTS.md'] as $file) {
                $filesystem->copy($root.'/'.$file, $directory.'/'.$file);
            }

            $filesystem->ensureDirectoryExists($directory.'/scripts');
            $filesystem->copy($root.'/scripts/test-chisel.py', $directory.'/scripts/test-chisel.py');

            // Exercise the real trimming script; builds, formatting and migrations
            // are checked separately in full disposable installation runs.
            foreach (['composer', 'php'] as $command) {
                file_put_contents($directory.'/bin/'.$command, "#!/bin/sh\nexit 0\n");
                chmod($directory.'/bin/'.$command, 0755);
            }
            file_put_contents($directory.'/run.php', <<<'PHP'
<?php
$script = require __DIR__.'/chisel.php';
$script->chisel(['auth_features' => json_decode($argv[1], true)]);
PHP);
            $process = new Process([PHP_BINARY, 'run.php', json_encode($features)], $directory, [
                'PATH' => $directory.'/bin:'.getenv('PATH'),
                'LARAVEL_INSTALLER_AUTOLOADER' => $root.'/vendor/autoload.php',
                'LARAVEL_INSTALLER_NO_NODE' => '1',
            ]);
            $process->mustRun();

            $read = fn (string $path): string => file_get_contents($directory.'/'.$path);
            $provider = $read('resources/js/components/confirmation-provider.tsx');
            $basic = $read('resources/js/components/action-confirmation-provider.tsx');
            $middleware = $read('app/Http/Middleware/HandleInertiaRequests.php');
            $fortify = $read('app/Providers/FortifyServiceProvider.php');
            $policyTests = $read('tests/Feature/Settings/PasswordConfirmationPolicyTest.php');

            $this->assertStringContainsString('ActionConfirmationProvider', $provider);
            $this->assertStringContainsString('options.always', $basic);
            $this->assertStringContainsString('finish(true)', $basic);
            $this->assertStringContainsString('finish(false)', $basic);
            foreach (['PasswordInput', 'checkStatus', 'http.', 'passwordConfirmation', 'canConfirmWithPasskey'] as $deadCode) {
                $this->assertStringNotContainsString($deadCode, $basic);
            }

            $passwordProvider = 'resources/js/components/password-confirmation-provider.tsx';
            $this->assertSame($confirmation, file_exists($directory.'/'.$passwordProvider));
            $this->assertSame($confirmation, file_exists($directory.'/app/Http/Middleware/ConfirmSensitiveAction.php'));
            if ($confirmation) {
                $identity = $read($passwordProvider);
                $this->assertStringContainsString('PasswordConfirmationProvider', $provider);
                $this->assertStringContainsString('passwordConfirmation', $middleware);
                $controller = $read('app/Http/Controllers/Auth/PasswordConfirmationController.php');
                $this->assertSame($passkeys, str_contains($controller, 'function status('));
                $this->assertSame($passkeys, str_contains($identity, 'canConfirmWithPasskey'));
                $this->assertSame($passkeys, str_contains($fortify, "[PasswordConfirmationController::class, 'status']"));
                if (! $passkeys) {
                    $this->assertStringNotContainsString('canConfirmWithPasskey', $controller);
                    $this->assertStringNotContainsString('canConfirmWithPasskey', $read('resources/js/pages/auth/confirm-password.tsx'));
                }
            } else {
                foreach (['PasswordConfirmationProvider', 'usePage', 'passwordConfirmation'] as $deadCode) {
                    $this->assertStringNotContainsString($deadCode, $provider);
                }
                $this->assertStringNotContainsString('passwordConfirmation', $middleware);
                $this->assertStringNotContainsString("RateLimiter::for('password-confirmation'", $fortify);
                $this->assertStringNotContainsString('ConfirmSensitiveAction', $read('bootstrap/app.php'));
                $this->assertStringNotContainsString('test_confirmation_endpoint_rejects', $policyTests);
                $this->assertFileDoesNotExist($directory.'/resources/js/pages/auth/confirm-password.tsx');
                $this->assertFileDoesNotExist($directory.'/app/Http/Controllers/Auth/PasswordConfirmationController.php');
            }

            $this->assertSame($passkeys, file_exists($directory.'/tests/Support/PasskeyAuthenticator.php'));
            $this->assertSame($passkeys, str_contains($policyTests, 'test_passkey_registration_confirmation_and_removal'));
            $this->assertSame($passkeys, str_contains($read('package.json'), '@laravel/passkeys'));
            if (! $passkeys) {
                $this->assertStringNotContainsString('canConfirmWithPasskey', $fortify);
                $this->assertFileDoesNotExist($directory.'/resources/js/components/passkey-verify.tsx');
            }
            $featureFiles = [
                'registration' => [
                    'app/Actions/Fortify/CreateNewUser.php',
                    'resources/js/pages/auth/register.tsx',
                    'tests/Feature/Auth/RegistrationTest.php',
                ],
                'email-verification' => [
                    'resources/js/pages/auth/verify-email.tsx',
                    'tests/Feature/Auth/EmailVerificationTest.php',
                    'tests/Feature/Auth/VerificationNotificationTest.php',
                ],
                '2fa' => [
                    'resources/js/pages/auth/two-factor-challenge.tsx',
                    'resources/js/components/manage-two-factor.tsx',
                    'resources/js/components/alert-error.tsx',
                    'resources/js/components/two-factor-setup-modal.tsx',
                    'resources/js/components/two-factor-recovery-codes.tsx',
                    'resources/js/components/ui/input-otp.tsx',
                    'resources/js/hooks/use-two-factor-auth.ts',
                    'resources/js/hooks/use-clipboard.ts',
                    'database/migrations/2025_08_14_170933_add_two_factor_columns_to_users_table.php',
                    'tests/Feature/Auth/TwoFactorChallengeTest.php',
                ],
                'passkeys' => [
                    'resources/js/components/passkey-item.tsx',
                    'resources/js/components/passkey-register.tsx',
                    'resources/js/components/passkey-verify.tsx',
                    'resources/js/components/manage-passkeys.tsx',
                    'resources/js/components/ui/empty.tsx',
                    'resources/js/components/ui/badge.tsx',
                    'tests/Support/PasskeyAuthenticator.php',
                    'database/migrations/2024_01_01_000000_create_passkeys_table.php',
                ],
                'password-confirmation' => [
                    'resources/js/pages/auth/confirm-password.tsx',
                    'resources/js/components/password-confirmation-provider.tsx',
                    'app/Http/Controllers/Auth/PasswordConfirmationController.php',
                    'app/Http/Requests/Auth/ConfirmPasswordRequest.php',
                    'app/Http/Middleware/ConfirmSensitiveAction.php',
                    'tests/Feature/Auth/PasswordConfirmationTest.php',
                ],
            ];
            foreach ($featureFiles as $feature => $paths) {
                foreach ($paths as $path) {
                    $this->assertSame(in_array($feature, $features, true), is_file($directory.'/'.$path), $path);
                }
            }

            $user = $read('app/Models/User.php');
            $this->assertSame($verification, str_contains($user, 'MustVerifyEmail'));
            $this->assertSame($twoFactor, str_contains($user, 'TwoFactorAuthenticatable'));
            $this->assertSame($passkeys, str_contains($user, 'PasskeyAuthenticatable'));
            $packages = json_decode($read('package.json'), true, 512, JSON_THROW_ON_ERROR)['dependencies'];
            $this->assertSame($twoFactor, isset($packages['input-otp']));
            $this->assertSame($passkeys, isset($packages['@laravel/passkeys']));
            $this->assertSame($registration, str_contains($fortify, 'CreateNewUser'));
            $this->assertSame($registration, str_contains($read('app/Concerns/ProfileValidationRules.php'), 'function profileRules('));
            $this->assertSame($verification, str_contains($read('app/Http/Controllers/Settings/ProfileController.php'), 'mustVerifyEmail'));
            $this->assertSame($verification, str_contains($read('resources/js/components/delete-user.tsx'), 'requiresEmailVerification'));
            $this->assertSame($twoFactor, str_contains($user, '$two_factor_'));
            $securityController = $read('app/Http/Controllers/Settings/SecurityController.php');
            $this->assertSame($twoFactor || $passkeys, str_contains($securityController, 'use Illuminate\\Http\\Request;'));
            $this->assertSame($twoFactor, str_contains($user, "'two_factor_secret'"));
            $this->assertSame($twoFactor, str_contains($policyTests, 'EnableTwoFactorAuthentication'));
            $this->assertSame($confirmation, str_contains($basic, 'expiresAt'));
            $this->assertSame($confirmation, str_contains($read('resources/js/hooks/use-confirmation.ts'), 'expiresAt'));
            $this->assertSame($confirmation, str_contains($read('tests/Feature/Settings/EmailChangeTest.php'), 'test_session_alone_cannot_request_a_change_when_confirmation_is_enabled'));
            $this->assertSame($passkeys, str_contains($fortify, "'passkey.confirm'"));
            if ($twoFactor) {
                $this->assertSame($confirmation, str_contains($read('resources/js/components/manage-two-factor.tsx'), 'confirmationEnabled'));
            }

            // Every recognized marker must be consumed, including inline/nested regions.
            $generated = Finder::create()->files()->in($directory)->name(['*.php', '*.tsx', '*.ts']);
            foreach ($generated as $file) {
                $this->assertDoesNotMatchRegularExpression('/@(end-)?chisel-[a-z0-9-]+/', $file->getContents(), $file->getRelativePathname());
            }

            // These shared account-safety features survive every selection.
            foreach ([
                'app/Http/Controllers/Settings/EmailChangeController.php',
                'resources/js/components/action-confirmation-provider.tsx',
                'resources/js/components/confirmed-form.tsx',
                'resources/js/components/flash-toaster.tsx',
                'resources/js/components/notification-alert.tsx',
                'resources/js/components/password-input.tsx',
                'README.md',
            ] as $path) {
                $this->assertFileExists($directory.'/'.$path);
            }
            foreach ([
                'AGENTS.md', 'README-maintainer.md', 'chisel.php', 'chisel-paths.php', 'scripts/test-chisel.py',
                'app/Console/Commands/InstallFeaturesCommand.php',
                'tests/Unit/InstallerMigrationHookTest.php', 'tests/Unit/ChiselFeatureCleanupTest.php',
            ] as $path) {
                $this->assertFileDoesNotExist($directory.'/'.$path);
            }
            $composer = json_decode($read('composer.json'), true, 512, JSON_THROW_ON_ERROR);
            $this->assertIsArray($composer);
            $this->assertStringNotContainsString('@php artisan install:features', $read('composer.json'));

            $this->assertFileExists($directory.'/README.md');
            $this->assertFileDoesNotExist($directory.'/chisel.php');
            $this->assertFileDoesNotExist($directory.'/tests/Unit/ChiselFeatureCleanupTest.php');
        } finally {
            $filesystem->deleteDirectory($directory);
        }
    }
}
