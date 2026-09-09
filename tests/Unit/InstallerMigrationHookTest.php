<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\Process;

class InstallerMigrationHookTest extends TestCase
{
    public function test_composer_waits_for_feature_selection_before_migrating(): void
    {
        $directory = sys_get_temp_dir().'/starter-kit-hooks-'.bin2hex(random_bytes(8));
        mkdir($directory.'/database', 0777, true);
        copy(__DIR__.'/../../composer.json', $directory.'/composer.json');
        file_put_contents($directory.'/chisel.php', '<?php');
        file_put_contents($directory.'/database/database.sqlite', 'existing database');
        file_put_contents($directory.'/artisan', <<<'ARTISAN'
<?php
file_put_contents(__DIR__.'/commands.jsonl', json_encode(array_slice($argv, 1)).PHP_EOL, FILE_APPEND);
ARTISAN);

        try {
            $runHook = function () use ($directory): array {
                $process = new Process(['composer', 'run', 'post-create-project-cmd', '--no-interaction'], $directory);
                $process->mustRun();

                return array_map(
                    fn (string $line): string => json_decode($line, true, 512, JSON_THROW_ON_ERROR)[0],
                    file($directory.'/commands.jsonl', FILE_IGNORE_NEW_LINES),
                );
            };

            $this->assertSame(['key:generate'], $runHook());

            // A completed Chisel run removes its script before this hook can migrate.
            unlink($directory.'/chisel.php');
            unlink($directory.'/commands.jsonl');
            $this->assertSame(['key:generate', 'migrate'], $runHook());
            $this->assertSame('existing database', file_get_contents($directory.'/database/database.sqlite'));
        } finally {
            foreach (glob($directory.'/*') as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }

            unlink($directory.'/database/database.sqlite');
            rmdir($directory.'/database');
            rmdir($directory);
        }
    }
}
