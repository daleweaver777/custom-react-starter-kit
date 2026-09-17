<?php

require getenv('LARAVEL_INSTALLER_AUTOLOADER') ?: __DIR__.'/vendor/autoload.php';

use Illuminate\Filesystem\Filesystem;
use Laravel\Chisel\Chisel;
use Laravel\Chisel\Question;
use Laravel\Prompts\Support\Logger;
use Symfony\Component\Process\Process;

use function Laravel\Prompts\task;

/** @param list<string> $command */
function chiselRun(array $command, string $label): void
{
    $process = task(
        label: $label,
        keepSummary: true,
        callback: function (Logger $logger) use ($command) {
            $process = new Process($command);
            $process->run(function ($type, $line) use ($logger) {
                $logger->line($line);
            });

            if ($process->isSuccessful()) {
                $logger->success(implode(' ', $command));

                return $process;
            }

            $logger->error(implode(' ', $command));
            $logger->error('Error output: '.trim($process->getErrorOutput()));
            $logger->error('Chisel: Your project may be in a partially-modified state — review the output above before continuing.');

            return $process;
        },
    );

    if (! $process->isSuccessful()) {
        exit($process->getExitCode());
    }
}

function chiselSkipsNode(): bool
{
    return filter_var(
        $_ENV['LARAVEL_INSTALLER_NO_NODE']
            ?? $_SERVER['LARAVEL_INSTALLER_NO_NODE']
            ?? getenv('LARAVEL_INSTALLER_NO_NODE'),
        FILTER_VALIDATE_BOOL,
    );
}

/** @var array{login: string, register: string, welcome: string, change_email: string, verify_email: string} $paths */
$paths = require __DIR__.'/chisel-paths.php';

return Chisel::script(__DIR__)
    ->questions([
        Question::multiselect(
            name: 'auth_features',
            label: 'Which optional authentication features would you like to enable?',
            options: [
                'email-verification' => 'Email verification',
                'registration' => 'Registration',
            ],
            default: ['email-verification', 'registration'],
            hint: 'Use space to select, enter to confirm.',
        ),
    ])
    ->apply(function (Chisel $c, array $answers): void {
        if (array_keys($answers) !== ['auth_features']
            || ! is_array($answers['auth_features'])
            || ! array_is_list($answers['auth_features'])
            || count(array_unique($answers['auth_features'], SORT_REGULAR)) !== count($answers['auth_features'])) {
            throw new InvalidArgumentException('Expected auth_features to be a list of unique feature names.');
        }

        foreach ($answers['auth_features'] as $feature) {
            if (! in_array($feature, ['email-verification', 'registration'], true)) {
                throw new InvalidArgumentException('Only email-verification and registration are optional features.');
            }
        }
    })
    ->selected(
        'auth_features',
        'registration',
        then: function (Chisel $c) use ($paths) {
            $c->files(
                'config/fortify.php',
                'app/Providers/FortifyServiceProvider.php',
                'app/Concerns/ProfileValidationRules.php',
                'tests/Feature/Auth/EmailVerificationTest.php',
                $paths['login'],
                $paths['welcome'],
            )->removeSectionMarkers('registration');
        },
        else: function (Chisel $c) use ($paths) {
            $c->file('config/fortify.php')->removeSection('registration');

            $c->files(
                'app/Providers/FortifyServiceProvider.php',
                'app/Concerns/ProfileValidationRules.php',
                'tests/Feature/Auth/EmailVerificationTest.php',
                $paths['login'],
                $paths['welcome'],
            )->removeSection('registration');

            $c->files(
                'app/Actions/Fortify/CreateNewUser.php',
                $paths['register'],
                'tests/Feature/Auth/RegistrationTest.php',
            )->delete();
        },
    )
    ->selected(
        'auth_features',
        'email-verification',
        then: function (Chisel $c) use ($paths) {
            $c->files(
                'config/fortify.php',
                $paths['change_email'],
                'app/Providers/FortifyServiceProvider.php',
                'app/Http/Controllers/Settings/ProfileController.php',
                'resources/js/components/delete-user.tsx',
                'routes/web.php',
                'routes/settings.php',
                'tests/Feature/Settings/ProfileUpdateTest.php',
            )->removeSectionMarkers('email-verification');
        },
        else: function (Chisel $c) use ($paths) {
            $c->php('app/Models/User.php')
                ->removeImport('Illuminate\Contracts\Auth\MustVerifyEmail')
                ->removeInterface('MustVerifyEmail');

            $c->files(
                'config/fortify.php',
                'app/Providers/FortifyServiceProvider.php',
                'app/Http/Controllers/Settings/ProfileController.php',
                'resources/js/components/delete-user.tsx',
                'routes/web.php',
                'routes/settings.php',
                'tests/Feature/Settings/ProfileUpdateTest.php',
                $paths['change_email'],
            )->removeSection('email-verification');

            $c->files(
                $paths['verify_email'],
                'tests/Feature/Auth/EmailVerificationTest.php',
                'tests/Feature/Auth/VerificationNotificationTest.php',
            )->delete();
        },
    )
    ->apply(function (Chisel $c): void {
        $filesystem = new Filesystem;

        // Keep the generated application's manifest independent of maintenance tooling.
        $composer = $filesystem->json(__DIR__.'/composer.json', JSON_THROW_ON_ERROR);
        unset(
            $composer['scripts']['test:maintainer'],
            $composer['scripts']['test:installer'],
            $composer['scripts']['types:check:maintainer'],
        );
        $composer['scripts']['post-update-cmd'] = array_values(array_filter(
            $composer['scripts']['post-update-cmd'],
            fn (string $command): bool => ! str_contains($command, 'install:features'),
        ));
        unset($composer['extra']['laravel']['installer']);
        file_put_contents(__DIR__.'/composer.json', json_encode($composer, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL);

        $package = $filesystem->json(__DIR__.'/package.json', JSON_THROW_ON_ERROR);
        unset($package['scripts']['test:browser'], $package['scripts']['doctor']);
        unset($package['devDependencies']['@playwright/test']);
        file_put_contents(__DIR__.'/package.json', json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL);

        $workflow = __DIR__.'/tests/Maintainer/Fixtures/application-tests.yml';
        if (is_file($workflow)) {
            $filesystem->ensureDirectoryExists(__DIR__.'/.github/workflows');
            $filesystem->copy($workflow, __DIR__.'/.github/workflows/tests.yml');
        }

        foreach (['tests/Maintainer', 'docs/maintainer', '.migration'] as $directory) {
            if (is_dir(__DIR__.'/'.$directory) && ! $filesystem->deleteDirectory(__DIR__.'/'.$directory)) {
                throw new RuntimeException('Could not remove maintainer directory: '.$directory);
            }
        }

        $c->files(
            'AGENTS.md',
            'README-maintainer.md',
            'phpunit.maintainer.xml',
            'phpstan.maintainer.neon',
            'doctor.config.json',
            'playwright.config.ts',
            'scripts/test-chisel.py',
            'scripts/test-browser.mjs',
        )->delete();

        chiselRun(['composer', 'lint'], 'Composer Lint');
        chiselRun(['php', 'artisan', 'wayfinder:generate', '--with-form', '--no-interaction'], 'Generate Wayfinder Resources');

        if (! chiselSkipsNode()) {
            // npm reconciles its installed tree after removing maintainer dependencies.
            $c->npm()->install();
            $c->npm()->run('check:fix');
        }

        if (! file_exists(__DIR__.'/database/database.sqlite')) {
            touch(__DIR__.'/database/database.sqlite');
        }

        chiselRun(['php', 'artisan', 'migrate', '--graceful', '--ansi', '--no-interaction'], 'Migrate Application');

        $c->files(
            'app/Console/Commands/InstallFeaturesCommand.php',
            'chisel.php',
            'chisel-paths.php',
        )->delete();
    });
