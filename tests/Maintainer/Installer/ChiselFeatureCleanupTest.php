<?php

namespace Tests\Maintainer\Installer;

use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Process\Process;

class ChiselFeatureCleanupTest extends TestCase
{
    public static function featureSelections(): array
    {
        return [
            'both' => [['email-verification', 'registration']],
            'verification only' => [['email-verification']],
            'registration only' => [['registration']],
            'neither' => [[]],
        ];
    }

    #[DataProvider('featureSelections')]
    public function test_installed_features_and_application_packaging(array $features): void
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $this->markTestSkipped('The isolated command stubs require a POSIX shell.');
        }

        $root = dirname(__DIR__, 3);
        $directory = sys_get_temp_dir().'/chisel-cleanup-'.bin2hex(random_bytes(8));
        $filesystem = new Filesystem;
        $filesystem->ensureDirectoryExists($directory.'/bin');

        try {
            $files = Finder::create()->files()->in(array_map(
                fn (string $path) => $root.'/'.$path,
                ['app', 'bootstrap', 'config', 'database', 'resources', 'routes', 'tests'],
            ))->name(['*.php', '*.tsx', '*.ts', '*.css', '*.yml'])->exclude(['cache', 'ssr']);

            foreach ($files as $file) {
                $relative = substr($file->getPathname(), strlen($root) + 1);
                if (preg_match('#^resources/js/(actions|routes|wayfinder)/#', $relative)) {
                    continue;
                }
                $filesystem->ensureDirectoryExists(dirname($directory.'/'.$relative));
                $filesystem->copy($file->getPathname(), $directory.'/'.$relative);
            }

            foreach ([
                'chisel.php', 'chisel-paths.php', 'composer.json', 'package.json',
                'phpunit.xml', 'phpunit.maintainer.xml', 'README.md', 'README-maintainer.md',
                '.php-version', '.nvmrc',
                'phpstan.neon', 'phpstan.maintainer.neon',
                'AGENTS.md', 'docs/maintainer/CLEANUP-PLAN.md',
                'scripts/test-chisel.py', '.github/workflows/tests.yml',
            ] as $file) {
                $filesystem->ensureDirectoryExists(dirname($directory.'/'.$file));
                $filesystem->copy($root.'/'.$file, $directory.'/'.$file);
            }

            // Check actual transformations here; the matrix runner checks real commands.
            foreach (['composer', 'php'] as $command) {
                file_put_contents($directory.'/bin/'.$command, "#!/bin/sh\nexit 0\n");
                chmod($directory.'/bin/'.$command, 0755);
            }
            file_put_contents($directory.'/run.php', <<<'PHP'
<?php
$script = require __DIR__.'/chisel.php';
$script->chisel(['auth_features' => json_decode($argv[1], true)]);
PHP);
            (new Process([PHP_BINARY, 'run.php', json_encode($features)], $directory, [
                'PATH' => $directory.'/bin:'.getenv('PATH'),
                'LARAVEL_INSTALLER_AUTOLOADER' => $root.'/vendor/autoload.php',
                'LARAVEL_INSTALLER_NO_NODE' => '1',
            ]))->mustRun();

            foreach ([
                'registration' => ['app/Actions/Fortify/CreateNewUser.php', 'resources/js/pages/auth/register.tsx', 'tests/Feature/Auth/RegistrationTest.php'],
                'email-verification' => ['resources/js/pages/auth/verify-email.tsx', 'tests/Feature/Auth/EmailVerificationTest.php', 'tests/Feature/Auth/VerificationNotificationTest.php'],
            ] as $feature => $paths) {
                foreach ($paths as $path) {
                    $this->assertSame(in_array($feature, $features, true), is_file($directory.'/'.$path), $path);
                }
            }

            foreach ([
                'app/Http/Controllers/Settings/EmailChangeController.php',
                'app/Http/Controllers/Auth/PasswordConfirmationController.php',
                'app/Http/Middleware/ConfirmSensitiveAction.php',
                'resources/js/components/confirmed-form.tsx',
                'resources/js/components/password-confirmation-provider.tsx',
                'resources/js/components/action-confirmation-provider.tsx',
                'resources/js/components/manage-passkeys.tsx',
                'resources/js/components/manage-two-factor.tsx',
                'resources/js/components/flash-toaster.tsx',
                'resources/js/components/notification-alert.tsx',
                'database/migrations/2024_01_01_000000_create_passkeys_table.php',
                'database/migrations/2025_08_14_170933_add_two_factor_columns_to_users_table.php',
                'tests/Feature/Auth/PasswordConfirmationTest.php',
                'tests/Feature/Auth/TwoFactorChallengeTest.php',
                'tests/Feature/Settings/EmailChangeTest.php',
                'README.md', '.php-version', '.nvmrc', 'phpunit.xml', 'phpstan.neon', '.github/workflows/tests.yml',
            ] as $path) {
                $this->assertFileExists($directory.'/'.$path);
            }
            foreach ([
                'tests/Maintainer', 'phpunit.maintainer.xml', 'phpstan.maintainer.neon', 'AGENTS.md', 'README-maintainer.md',
                'docs/maintainer', 'scripts/test-chisel.py',
                'app/Console/Commands/InstallFeaturesCommand.php', 'chisel.php', 'chisel-paths.php',
            ] as $path) {
                $this->assertFalse(file_exists($directory.'/'.$path), $path.' must not ship');
            }

            $composer = json_decode(file_get_contents($directory.'/composer.json'), true, 512, JSON_THROW_ON_ERROR);
            $this->assertArrayNotHasKey('test:maintainer', $composer['scripts']);
            $this->assertArrayNotHasKey('types:check:maintainer', $composer['scripts']);
            $this->assertStringNotContainsString('install:features', json_encode($composer));
            $this->assertStringNotContainsString('Maintainer', file_get_contents($directory.'/.github/workflows/tests.yml'));
            $packages = json_decode(file_get_contents($directory.'/package.json'), true, 512, JSON_THROW_ON_ERROR);
            $this->assertArrayHasKey('@laravel/passkeys', $packages['dependencies']);
            $this->assertArrayHasKey('input-otp', $packages['dependencies']);

            foreach (Finder::create()->files()->in($directory)->name(['*.php', '*.tsx', '*.ts', '*.css']) as $file) {
                $this->assertDoesNotMatchRegularExpression('/@(end-)?chisel-[a-z0-9-]+/', $file->getContents(), $file->getRelativePathname());
            }
        } finally {
            $filesystem->deleteDirectory($directory);
        }
    }
}
