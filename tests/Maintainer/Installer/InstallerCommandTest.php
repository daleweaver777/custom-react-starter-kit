<?php

namespace Tests\Maintainer\Installer;

use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\Process;

class InstallerCommandTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->directory = sys_get_temp_dir().'/installer-command-'.bin2hex(random_bytes(8));
        mkdir($this->directory);
        file_put_contents($this->directory.'/run.php', <<<'PHP'
<?php
require getenv('LARAVEL_INSTALLER_AUTOLOADER');
$app = new Illuminate\Foundation\Application(__DIR__);
$app->instance('events', new Illuminate\Events\Dispatcher($app));
$console = new Symfony\Component\Console\Application;
$console->setAutoExit(false);
$command = new App\Console\Commands\InstallFeaturesCommand;
$command->setLaravel($app);
$console->addCommand($command);
exit($console->run(new Symfony\Component\Console\Input\ArgvInput([
    $argv[0], 'install:features', '--no-interaction', ...array_slice($argv, 1),
])));
PHP);
    }

    protected function tearDown(): void
    {
        (new Filesystem)->deleteDirectory($this->directory);

        parent::tearDown();
    }

    public static function invalidAnswers(): array
    {
        return [
            'malformed JSON' => ['{'],
            'array instead of object' => ['[]'],
            'unknown question' => ['{"unknown":[]}'],
            'missing list' => ['{"auth_features":null}'],
            'string instead of list' => ['{"auth_features":"registration"}'],
            'associative feature list' => ['{"auth_features":{"feature":"registration"}}'],
            'non-string feature' => ['{"auth_features":[null]}'],
            'nested feature' => ['{"auth_features":[["registration"]]}'],
            'duplicate feature' => ['{"auth_features":["registration","registration"]}'],
            'retired option' => ['{"auth_features":["passkeys"]}'],
            'unknown option' => ['{"auth_features":["teams"]}'],
        ];
    }

    #[DataProvider('invalidAnswers')]
    public function test_invalid_answers_fail_before_trimming(string $answers): void
    {
        foreach (['chisel.php', 'chisel-paths.php'] as $file) {
            copy(dirname(__DIR__, 3).'/'.$file, $this->directory.'/'.$file);
        }
        file_put_contents($this->directory.'/sentinel', 'untouched');
        $before = $this->snapshot();

        $process = $this->runCommand($answers);

        $this->assertSame(2, $process->getExitCode(), $process->getOutput().$process->getErrorOutput());
        $this->assertSame($before, $this->snapshot());
    }

    public function test_deferred_hook_does_not_load_or_modify_the_installer(): void
    {
        file_put_contents($this->directory.'/chisel.php', '<?php throw new RuntimeException("Installer must not run");');
        $before = $this->snapshot();

        $process = $this->runCommand(deferred: true);

        $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput());
        $this->assertSame($before, $this->snapshot());
    }

    public function test_direct_chisel_rejects_a_retired_feature_before_trimming(): void
    {
        foreach (['chisel.php', 'chisel-paths.php'] as $file) {
            copy(dirname(__DIR__, 3).'/'.$file, $this->directory.'/'.$file);
        }
        file_put_contents($this->directory.'/run.php', <<<'PHP'
<?php
$script = require __DIR__.'/chisel.php';
try {
    $script->chisel(['auth_features' => ['registration', 'passkeys']]);
} catch (InvalidArgumentException $exception) {
    echo $exception->getMessage();
    exit(2);
}
PHP);
        file_put_contents($this->directory.'/sentinel', 'untouched');
        $before = $this->snapshot();

        $process = $this->runCommand();

        $this->assertSame(2, $process->getExitCode(), $process->getOutput().$process->getErrorOutput());
        $this->assertStringContainsString('Only email-verification and registration are optional features.', $process->getOutput());
        $this->assertSame($before, $this->snapshot());
    }

    public function test_explicit_answers_bypass_hook_deferral(): void
    {
        $this->createRecordingScript();

        $process = $this->runCommand('{"auth_features":["registration"]}', deferred: true);

        $this->assertSame(0, $process->getExitCode(), $process->getOutput().$process->getErrorOutput());
        $this->assertSame(['auth_features' => ['registration']], json_decode(file_get_contents($this->directory.'/answers.json'), true));
    }

    public function test_noninteractive_install_uses_the_question_defaults(): void
    {
        $this->createRecordingScript();

        $process = $this->runCommand();

        $this->assertSame(0, $process->getExitCode(), $process->getOutput().$process->getErrorOutput());
        $this->assertSame(['auth_features' => ['email-verification', 'registration']], json_decode(file_get_contents($this->directory.'/answers.json'), true));
    }

    public function test_completed_installation_is_a_noop(): void
    {
        $before = $this->snapshot();

        $process = $this->runCommand();

        $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput());
        $this->assertSame($before, $this->snapshot());
    }

    private function runCommand(?string $answers = null, bool $deferred = false): Process
    {
        $command = [PHP_BINARY, 'run.php'];
        if ($answers !== null) {
            $command[] = '--answers='.$answers;
        }
        $process = new Process($command, $this->directory, [
            'LARAVEL_INSTALLER_AUTOLOADER' => dirname(__DIR__, 3).'/vendor/autoload.php',
            'LARAVEL_INSTALLER_NO_NODE' => '1',
            'LARAVEL_INSTALLER_DEFER_HOOKS' => $deferred ? '1' : '0',
        ]);
        $process->run();

        return $process;
    }

    private function snapshot(): array
    {
        $files = [];
        foreach (glob($this->directory.'/*') as $path) {
            $files[basename($path)] = hash_file('sha256', $path);
        }

        return $files;
    }

    private function createRecordingScript(): void
    {
        file_put_contents($this->directory.'/chisel.php', <<<'PHP'
<?php
return Laravel\Chisel\Chisel::script(__DIR__)
    ->questions([Laravel\Chisel\Question::multiselect(
        name: 'auth_features',
        label: 'Authentication features',
        options: ['email-verification' => 'Email verification', 'registration' => 'Registration'],
        default: ['email-verification', 'registration'],
    )])
    ->apply(fn ($chisel, $answers) => file_put_contents(__DIR__.'/answers.json', json_encode($answers)));
PHP);
    }
}
