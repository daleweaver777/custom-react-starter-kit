<?php

namespace Tests\Maintainer\Security;

use App\Actions\Fortify\ResetUserPassword;
use App\Models\PendingEmailChange;
use App\Models\User;
use App\Notifications\EmailChanged;
use App\Notifications\VerifyEmailChange;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmailChangeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    public function test_precognition_returns_laravel_email_errors_before_confirmation(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($user)->withPrecognition();
        foreach (['' => 'The email field is required.', 'not-an-email' => 'The email field must be a valid email address.', $other->email => 'The email has already been taken.'] as $email => $message) {
            $this->postJson(route('profile.email.store'), ['email' => $email])
                ->assertUnprocessable()->assertJsonPath('errors.email.0', $message)
                ->assertSessionMissing('auth.password_confirmed_at');
        }
        $this->assertDatabaseCount('pending_email_changes', 0);
        $this->assertSame($user->email, $user->fresh()->email);
        Notification::assertNothingSent();
    }

    public function test_successful_precognition_does_not_create_a_pending_change(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->withPrecognition()
            ->withHeader('Precognition-Validate-Only', 'email')
            ->postJson(route('profile.email.store'), ['email' => 'new@example.com'])
            ->assertSuccessfulPrecognition()->assertSessionMissing('auth.password_confirmed_at');
        $this->assertDatabaseCount('pending_email_changes', 0);
        Notification::assertNothingSent();
    }

    public function test_validation_does_not_consume_the_email_sending_budget(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->withPrecognition()->withHeader('Precognition-Validate-Only', 'email');
        for ($i = 0; $i < 8; $i++) {
            $this->postJson(route('profile.email.store'), ['email' => 'new@example.com'])->assertSuccessfulPrecognition();
        }
        $this->withHeader('Precognition', 'false')->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('profile.email.store'), ['email' => 'new@example.com'])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('pending_email_changes', 1);
    }

    public function test_precognition_requires_login_and_does_not_bypass_other_sensitive_routes(): void
    {
        $this->withPrecognition()->postJson(route('profile.email.store'), ['email' => 'new@example.com'])->assertUnauthorized();

        if (config('fortify.password_confirmation')) {
            $this->actingAs(User::factory()->create())->deleteJson(route('profile.destroy'))->assertStatus(423);
            $this->withHeader('Precognition', 'false')->postJson(route('profile.email.store'), ['email' => 'new@example.com'])->assertStatus(423);
        }

        $this->assertDatabaseCount('pending_email_changes', 0);
    }

    public function test_profile_update_cannot_replace_email_even_with_a_password(): void
    {
        $user = User::factory()->create();
        $original = $user->email;

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => 'New name',
            'email' => 'attacker@example.com',
        ])->assertSessionHasErrors('email');

        $this->assertSame($original, $user->fresh()->email);
        $this->assertDatabaseCount('pending_email_changes', 0);
        Notification::assertNothingSent();
    }

    public function test_session_alone_cannot_request_a_change_when_confirmation_is_enabled(): void
    {
        if (! config('fortify.password_confirmation')) {
            $this->markTestSkipped('Password confirmation was removed.');
        }
        $user = User::factory()->create();
        $this->actingAs($user)->postJson(route('profile.email.store'), ['email' => 'attacker@example.com'])
            ->assertStatus(423);
        $this->assertDatabaseCount('pending_email_changes', 0);
        Notification::assertNothingSent();
    }

    public function test_pending_address_cannot_receive_recovery_until_confirmed(): void
    {
        $user = User::factory()->create();
        $original = $user->email;
        $verifiedAt = $user->email_verified_at;
        $url = $this->requestChange($user);

        $this->assertSame($original, $user->fresh()->email);
        $this->assertTrue($verifiedAt->equalTo($user->fresh()->email_verified_at));
        $this->assertSame(Password::INVALID_USER, Password::sendResetLink(['email' => 'new@example.com']));
        $this->assertSame(Password::RESET_LINK_SENT, Password::sendResetLink(['email' => $original]));
        Notification::assertSentTo($user, ResetPassword::class);

        $this->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page
            ->where('pendingEmail', 'new@example.com'));
        $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('settings/confirm-email-change')->where('email', 'new@example.com'));
        $this->assertSame($original, $user->fresh()->email);

        $this->post($url)->assertRedirect(route('profile.edit'))->assertSessionHasNoErrors();
        $this->assertSame('new@example.com', $user->fresh()->email);
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertDatabaseCount('pending_email_changes', 0);
        $this->assertSame(Password::INVALID_USER, Password::sendResetLink(['email' => $original]));
        $this->assertSame(Password::RESET_LINK_SENT, Password::sendResetLink(['email' => 'new@example.com']));
        Notification::assertSentOnDemand(EmailChanged::class, fn ($notice, $channels, $recipient) => $recipient->routes['mail'] === $original && $notice->email === 'new@example.com');
        $this->post($url)->assertForbidden();
        Notification::assertSentOnDemandTimes(EmailChanged::class, 1);
    }

    public function test_confirmation_requires_the_requesting_account_and_secret_token(): void
    {
        $user = User::factory()->create();
        $original = $user->email;
        $url = $this->requestChange($user);

        $this->actingAs(User::factory()->create())->get($url)->assertForbidden();
        $this->post($url)->assertForbidden();
        $this->actingAs($user)->post(route('profile.email.update', ['token' => str_repeat('x', 64)]))->assertForbidden();

        $this->assertSame($original, $user->fresh()->email);
        $this->assertDatabaseCount('pending_email_changes', 1);
    }

    public function test_guests_cannot_request_cancel_or_confirm_changes(): void
    {
        $url = route('profile.email.confirm', ['token' => str_repeat('x', 64)]);
        $this->post(route('profile.email.store'))->assertRedirect(route('login'));
        $this->delete(route('profile.email.destroy'))->assertRedirect(route('login'));
        $this->get($url)->assertRedirect(route('login'));
        $this->post($url)->assertRedirect(route('login'));
    }

    public function test_expired_and_abandoned_changes_leave_recovery_unchanged(): void
    {
        $user = User::factory()->create();
        $original = $user->email;
        $url = $this->requestChange($user);
        $this->travel(31)->minutes();

        $this->get($url)->assertForbidden();
        $this->post($url)->assertForbidden();
        $this->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page->where('pendingEmail', null));
        $this->assertSame($original, $user->fresh()->email);
        Notification::assertSentOnDemandTimes(EmailChanged::class, 0);
    }

    public function test_cancellation_and_replacement_invalidate_old_links(): void
    {
        $user = User::factory()->create();
        $first = $this->requestChange($user);
        $second = $this->requestChange($user, 'second@example.com');

        $this->post($first)->assertForbidden();
        $this->assertDatabaseCount('pending_email_changes', 1);
        $this->delete(route('profile.email.destroy'))->assertRedirect(route('profile.edit'));
        $this->post($second)->assertForbidden();
        $this->assertDatabaseCount('pending_email_changes', 0);
    }

    public function test_one_account_cannot_cancel_another_accounts_request(): void
    {
        $user = User::factory()->create();
        $this->requestChange($user);

        $this->actingAs(User::factory()->create())->delete(route('profile.email.destroy'))->assertRedirect();
        $this->assertDatabaseHas('pending_email_changes', ['user_id' => $user->id]);
    }

    public function test_duplicate_addresses_are_rejected_when_requested(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        foreach ([$user->email, $other->email] as $email) {
            $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()])->post(route('profile.email.store'), [
                'email' => $email,
            ])->assertSessionHasErrors('email');
        }

        $this->assertDatabaseCount('pending_email_changes', 0);
        Notification::assertNothingSent();
    }

    public function test_case_only_profile_edits_and_duplicate_email_requests_are_rejected(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        User::factory()->create(['email' => 'other@example.com']);
        $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()]);

        $this->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'TEST@EXAMPLE.COM',
        ])->assertSessionHasErrors('email');

        foreach (['TEST@EXAMPLE.COM', 'OTHER@EXAMPLE.COM'] as $email) {
            $this->post(route('profile.email.store'), ['email' => $email])->assertSessionHasErrors('email');
        }

        $this->assertSame('test@example.com', $user->fresh()->email);
        $this->assertDatabaseCount('pending_email_changes', 0);
        Notification::assertNothingSent();
    }

    public function test_address_claimed_while_pending_cannot_be_taken_over(): void
    {
        $user = User::factory()->create();
        $original = $user->email;
        $url = $this->requestChange($user);
        $other = User::factory()->create(['email' => 'new@example.com']);

        $this->post($url)->assertSessionHasErrors('email');
        $this->assertSame($original, $user->fresh()->email);
        $this->assertSame('new@example.com', $other->fresh()->email);
    }

    public function test_pending_addresses_are_not_reserved_and_only_one_can_claim_them(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();
        $firstUrl = $this->requestChange($first);
        $secondUrl = $this->requestChange($second);

        $this->actingAs($first)->post($firstUrl)->assertSessionHasNoErrors();
        $this->actingAs($second)->post($secondUrl)->assertSessionHasErrors('email');
        $this->assertSame('new@example.com', $first->fresh()->email);
        $this->assertNotSame('new@example.com', $second->fresh()->email);
    }

    public function test_new_address_is_normalized_and_token_is_stored_only_as_a_hash(): void
    {
        $user = User::factory()->create();
        $url = $this->requestChange($user, 'New@Example.com');
        $token = basename(parse_url($url, PHP_URL_PATH));
        $pending = PendingEmailChange::firstOrFail();

        $this->assertSame(hash('sha256', $token), $pending->token_hash);
        $this->assertStringNotContainsString($token, json_encode($pending->getAttributes()));
        $this->assertArrayNotHasKey('password_fingerprint', $pending->toArray());
        $this->post($url)->assertSessionHasNoErrors();
        $this->assertSame('new@example.com', $user->fresh()->email);
    }

    public function test_mixed_case_email_change_preserves_login_and_recovery(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $url = $this->requestChange($user, 'New@Example.COM');
        $this->post($url)->assertSessionHasNoErrors();
        $this->assertSame('new@example.com', $user->fresh()->email);

        Auth::logout();
        $this->flushSession();
        $this->post(route('login.store'), ['email' => 'NEW@EXAMPLE.COM', 'password' => 'password'])
            ->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);

        Auth::logout();
        $this->flushSession();
        $this->post(route('password.email'), ['email' => 'New@Example.COM'])->assertSessionHasNoErrors();
        Notification::assertSentTo($user->fresh(), ResetPassword::class);
    }

    public function test_case_variant_claim_while_pending_is_rejected_at_confirmation(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $url = $this->requestChange($user, 'New@Example.COM');
        $other = User::factory()->create(['email' => 'NEW@EXAMPLE.COM']);

        $this->post($url)->assertSessionHasErrors('email');
        $this->assertSame('old@example.com', $user->fresh()->email);
        $this->assertSame('new@example.com', $other->fresh()->email);
        Notification::assertSentOnDemandTimes(EmailChanged::class, 0);
    }

    public function test_password_reset_invalidates_pending_email_authorization(): void
    {
        $user = User::factory()->create();
        $original = $user->email;
        $url = $this->requestChange($user);
        (new ResetUserPassword)->reset($user, [
            'password' => 'A-new-secure-password-42!',
            'password_confirmation' => 'A-new-secure-password-42!',
        ]);

        // Even a fresh authenticated session cannot use the old authorization.
        $this->flushSession();
        $this->actingAs($user->fresh())->post($url)->assertForbidden();
        $this->assertSame($original, $user->fresh()->email);
    }

    public function test_password_update_invalidates_pending_email_authorization(): void
    {
        $user = User::factory()->create();
        $url = $this->requestChange($user);

        $this->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'A-new-secure-password-42!',
            'password_confirmation' => 'A-new-secure-password-42!',
        ])->assertSessionHasNoErrors();
        $this->post($url)->assertForbidden();
    }

    public function test_unverified_users_can_correct_their_email_safely(): void
    {
        $user = User::factory()->unverified()->create();
        $original = $user->email;
        $url = $this->requestChange($user);

        $this->assertSame($original, $user->fresh()->email);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->get($url)->assertOk();
        $this->post($url)->assertSessionHasNoErrors();
        $this->assertSame('new@example.com', $user->fresh()->email);
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_verification_mail_has_a_rate_limit(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()]);
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->post(route('profile.email.store'), ['email' => 'new@example.com'])->assertSessionHasNoErrors();
        }
        $this->post(route('profile.email.store'), ['email' => 'new@example.com'])->assertTooManyRequests();
        Notification::assertSentOnDemandTimes(VerifyEmailChange::class, 6);
    }

    public function test_email_change_does_not_depend_on_optional_fortify_features(): void
    {
        config(['fortify.features' => [], 'fortify.password_confirmation' => false]);
        $user = User::factory()->create();
        $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()])->post(route('profile.email.store'), ['email' => 'new@example.com'])
            ->assertSessionHasNoErrors();

        $url = $this->requestChange($user);
        $this->post($url)->assertSessionHasNoErrors();
        $this->assertSame('new@example.com', $user->fresh()->email);
    }

    public function test_account_deletion_removes_pending_changes(): void
    {
        $user = User::factory()->create();
        $this->requestChange($user);
        $user->delete();

        $this->assertDatabaseCount('pending_email_changes', 0);
    }

    public function test_confirmation_removes_reset_tokens_for_both_addresses(): void
    {
        $user = User::factory()->create();
        $oldToken = Password::createToken($user);
        // Model a token left behind by a previous owner of the proposed address.
        $previousOwner = User::factory()->create(['email' => 'new@example.com']);
        $newToken = Password::createToken($previousOwner);
        $previousOwner->delete();
        $url = $this->requestChange($user);

        $this->post($url)->assertSessionHasNoErrors();
        $this->assertFalse(Password::tokenExists($user, $oldToken));
        $this->assertFalse(Password::tokenExists($user->fresh(), $newToken));
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_verification_link_uses_the_configured_origin(): void
    {
        config(['app.url' => 'https://accounts.example.com']);
        $user = User::factory()->create();

        $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()])->post('https://untrusted.example/settings/email', [
            'email' => 'new@example.com',
        ])->assertSessionHasNoErrors();

        Notification::assertSentOnDemand(VerifyEmailChange::class, fn ($notice) => str_starts_with($notice->url, 'https://accounts.example.com/settings/email/confirm/'));
    }

    private function requestChange(User $user, string $email = 'new@example.com'): string
    {
        $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()])->post(route('profile.email.store'), [
            'email' => $email,
        ])->assertRedirect(route('profile.edit'))->assertSessionHasNoErrors();

        $url = null;
        Notification::assertSentOnDemand(VerifyEmailChange::class, function ($notice, $channels, $recipient) use ($email, &$url) {
            if ($recipient->routes['mail'] !== strtolower($email)) {
                return false;
            }

            $url = $notice->url;

            return true;
        });

        return $url;
    }
}
