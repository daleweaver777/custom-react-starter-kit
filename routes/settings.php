<?php

use App\Http\Controllers\Settings\EmailChangeController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
/* @chisel-password-confirmation */
use App\Http\Middleware\ConfirmSensitiveAction as RequirePassword;
/* @end-chisel-password-confirmation */
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::post('settings/email', [EmailChangeController::class, 'store'])
        ->middleware(HandlePrecognitiveRequests::class)
        /* @chisel-password-confirmation */
        ->middleware(RequirePassword::class)
        /* @end-chisel-password-confirmation */
        ->middleware('throttle:email-change')->name('profile.email.store');
    Route::delete('settings/email', [EmailChangeController::class, 'destroy'])->name('profile.email.destroy');
    Route::get('settings/email/confirm/{token}', [EmailChangeController::class, 'show'])
        ->middleware('throttle:6,1')->name('profile.email.confirm');
    Route::post('settings/email/confirm/{token}', [EmailChangeController::class, 'update'])
        ->middleware('throttle:6,1')->name('profile.email.update');
});

Route::middleware([
    'auth',
    /* @chisel-email-verification */
    'verified',
    /* @end-chisel-email-verification */
])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])
        /* @chisel-password-confirmation */
        ->middleware(RequirePassword::class)
        /* @end-chisel-password-confirmation */
        ->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});

/* @chisel-passkeys */
Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
/* @end-chisel-passkeys */
