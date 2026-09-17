<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use InvalidArgumentException;
use JsonException;
use Laravel\Chisel\Chisel;
use Laravel\Chisel\Question;
use Laravel\Chisel\Script;

use function Laravel\Prompts\multiselect;
use function Laravel\Prompts\spin;

class InstallFeaturesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'install:features
        {--answers= : JSON string of answers to skip interactive prompts}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Choose which starter kit features to keep';

    public function handle(): int
    {
        if ($this->shouldDeferInstallerHooks()) {
            return self::SUCCESS;
        }

        if (! file_exists(base_path('chisel.php'))) {
            return self::SUCCESS;
        }

        /** @var Script $script */
        $script = require base_path('chisel.php');

        try {
            $providedAnswers = [];
            if ($this->option('answers') !== null) {
                $decoded = json_decode((string) $this->option('answers'), false, 512, JSON_THROW_ON_ERROR);
                if (! $decoded instanceof \stdClass) {
                    throw new InvalidArgumentException('Answers must be a JSON object.');
                }
                $providedAnswers = (array) $decoded;
            }

            $questions = $script->questions();
            $names = array_map(fn (Question $question): string => $question->name, $questions);
            if (array_diff(array_keys($providedAnswers), $names) !== []) {
                throw new InvalidArgumentException('Unknown installer question. Use auth_features.');
            }

            $answers = $script
                ->collectAnswers()
                ->onQuestion(fn (Question $question) => multiselect(
                    label: $question->label,
                    options: $question->options,
                    default: $question->default ?? [],
                    required: $question->required,
                    hint: $question->hint,
                ))
                ->interactive($this->input->isInteractive())
                ->withAnswers($providedAnswers)
                ->toArray();

            foreach ($questions as $question) {
                $selected = $answers[$question->name];
                if (! is_array($selected) || ! array_is_list($selected)
                    || count(array_unique($selected, SORT_REGULAR)) !== count($selected)) {
                    throw new InvalidArgumentException('auth_features must be a list of unique feature names.');
                }
                foreach ($selected as $feature) {
                    if (! is_string($feature) || ! array_key_exists($feature, $question->options)) {
                        throw new InvalidArgumentException('Only email-verification and registration are optional features.');
                    }
                }
            }
        } catch (JsonException|InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::INVALID;
        }

        $script->chisel($answers);

        if (! $this->shouldSkipNode()) {
            $this->buildAssets();
        }

        return self::SUCCESS;
    }

    protected function shouldDeferInstallerHooks(): bool
    {
        if ($this->option('answers') !== null) {
            return false;
        }

        return $this->installerFlag('LARAVEL_INSTALLER_DEFER_HOOKS');
    }

    protected function shouldSkipNode(): bool
    {
        return $this->installerFlag('LARAVEL_INSTALLER_NO_NODE');
    }

    protected function installerFlag(string $name): bool
    {
        return filter_var(
            $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name),
            FILTER_VALIDATE_BOOL,
        );
    }

    protected function buildAssets(): void
    {
        $npm = Chisel::in(base_path())->npm();

        spin(
            fn () => $npm->run('build'),
            'Building assets...',
        );
    }
}
