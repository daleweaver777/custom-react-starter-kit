<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\EmailChangeRequest;
use App\Models\PendingEmailChange;
use App\Models\User;
use App\Notifications\EmailChanged;
use App\Notifications\VerifyEmailChange;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EmailChangeController extends Controller
{
    public function store(EmailChangeRequest $request): RedirectResponse
    {
        $token = Str::random(64);

        DB::transaction(function () use ($request, $token) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);

            // A concurrent password change must invalidate the requesting session too.
            abort_unless(hash_equals($user->getAuthPassword(), $request->user()->getAuthPassword()), 403);

            $pending = PendingEmailChange::query()->firstOrNew(['user_id' => $user->id]);
            $pending->forceFill([
                'original_email' => $user->email,
                'email' => $request->validated('email'),
                'token_hash' => hash('sha256', $token),
                'password_fingerprint' => hash('sha256', $user->getAuthPassword()),
                'expires_at' => now()->addMinutes(30),
            ])->save();
        });

        // Security mail uses the configured application origin, not the request Host.
        $url = rtrim(config('app.url'), '/').route('profile.email.confirm', ['token' => $token], false);
        Notification::route('mail', $request->validated('email'))->notify(new VerifyEmailChange($url));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Check your new email address for a verification link.')]);

        return to_route('profile.edit');
    }

    public function show(Request $request, string $token): Response
    {
        $pending = $this->pending($request->user(), $token);

        // GET is read-only so mail scanners cannot complete an email change.
        return Inertia::render('settings/confirm-email-change', [
            'email' => $pending->email,
            'token' => $token,
        ]);
    }

    public function update(Request $request, string $token): RedirectResponse
    {
        try {
            [$previousEmail, $email] = DB::transaction(function () use ($request, $token) {
                $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
                $pending = $this->pending($user, $token);

                // Pending addresses are not reserved; another account may have claimed it.
                if (User::query()->where('email', $pending->email)->exists()) {
                    throw ValidationException::withMessages(['email' => __('This email address is already in use. Cancel this change and choose another address.')]);
                }

                $previousEmail = $user->email;
                // Neither address may retain reset tokens issued before this change.
                Password::broker()->deleteToken($user);
                $user->forceFill(['email' => $pending->email, 'email_verified_at' => now()])->save();
                Password::broker()->deleteToken($user);
                $pending->delete();

                return [$previousEmail, $user->email];
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['email' => __('This email address is already in use. Cancel this change and choose another address.')]);
        }

        Notification::route('mail', $previousEmail)->notify(new EmailChanged($email));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Email address updated.')]);

        return to_route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            PendingEmailChange::query()->where('user_id', $user->id)->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Email change cancelled.')]);

        return to_route('profile.edit');
    }

    private function pending(User $user, string $token): PendingEmailChange
    {
        $pending = PendingEmailChange::query()->where('user_id', $user->id)->first();

        abort_unless(
            $pending
            && $pending->expires_at->isFuture()
            && hash_equals($pending->token_hash, hash('sha256', $token))
            && hash_equals($pending->password_fingerprint, hash('sha256', $user->getAuthPassword()))
            && $pending->original_email === $user->email,
            403,
            __('This email change link is invalid or expired. Request a new one from your profile settings.'),
        );

        return $pending;
    }
}
