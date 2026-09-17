<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Features;

// This fixture is executed only against an explicitly supplied disposable app.
$directory = realpath($argv[1] ?? '');
if (! $directory || $directory === realpath(__DIR__.'/../../..') || ! is_file($directory.'/artisan')) {
    throw new RuntimeException('Supply a disposable application directory, not the maintained checkout.');
}

require $directory.'/vendor/autoload.php';
$app = require $directory.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = $directory.'/database/browser.sqlite';
config(['database.connections.sqlite.database' => $database]);
DB::purge('sqlite');
if (is_file($database)) {
    unlink($database);
}
touch($database);
Artisan::call('migrate', ['--force' => true]);
Artisan::call('cache:clear');
file_put_contents($directory.'/storage/logs/laravel.log', '');

foreach (['chromium', 'firefox', 'webkit'] as $browser) {
    foreach (['', 'twofactor-', 'twofactor-race-success-', 'twofactor-race-failure-', 'twofactor-expiry-', 'twofactor-setup-expiry-', 'twofactor-policy-', 'passkey-', 'confirmation-expired-', 'confirmation-rejected-'] as $prefix) {
        User::factory()->create([
            'name' => 'Browser Test',
            'email' => $prefix.$browser.'@example.test',
            'password' => 'Browser-test-password-9!',
        ]);
    }

    if (! Features::enabled(Features::registration())) {
        User::factory()->unverified()->create([
            'name' => 'Browser Account',
            'email' => 'account-'.$browser.'@example.test',
            'password' => 'Browser-test-password-9!',
        ]);
    }
}

$testingDirectory = $directory.'/storage/framework/testing';
if (! is_dir($testingDirectory)) {
    mkdir($testingDirectory, 0755, true);
}
file_put_contents($testingDirectory.'/browser-features.json', json_encode([
    'registration' => Features::enabled(Features::registration()),
    'verification' => Features::enabled(Features::emailVerification()),
], JSON_THROW_ON_ERROR));

echo "Disposable browser fixtures ready.\n";
