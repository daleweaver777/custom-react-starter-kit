<?php

namespace Tests\Maintainer\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use PragmaRX\Google2FA\Google2FA;
use Tests\Maintainer\Support\PasskeyAuthenticator;
use Tests\TestCase;

class PasswordConfirmationPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirmation_routes_follow_the_installed_feature(): void
    {
        $enabled = (bool) config('fortify.password_confirmation');
        foreach (['password.confirm', 'password.confirm.store', 'password.confirmation'] as $route) {
            $this->assertSame($enabled, Route::has($route));
        }

        foreach (['passkey.confirm-options', 'passkey.confirm'] as $route) {
            $this->assertSame($enabled && Route::has('passkey.store'), Route::has($route));
        }

    }

    public function test_viewing_settings_never_requires_confirmation_or_exposes_secrets(): void
    {
        $user = User::factory()->create();
        foreach (['profile.edit', 'security.edit'] as $route) {
            $this->actingAs($user)->get(route($route))->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->missing('auth.user.password')

                    ->missing('auth.user.two_factor_secret')
                    ->missing('auth.user.two_factor_recovery_codes')->missing('recoveryCodes')

                    ->where('passwordConfirmation.enabled', (bool) config('fortify.password_confirmation'))

                );
        }
    }

    public function test_password_changes_always_require_the_correct_current_password(): void
    {
        $confirmationModes = [

            true,

            false,
        ];

        foreach ($confirmationModes as $enabled) {
            $this->flushSession();
            config(['fortify.password_confirmation' => $enabled]);
            $user = User::factory()->create();
            foreach ([null, 'incorrect'] as $current) {
                $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()])
                    ->putJson(route('user-password.update'), [
                        'current_password' => $current,
                        'password' => 'New-secure-password-42!',
                        'password_confirmation' => 'New-secure-password-42!',
                    ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
                $this->assertTrue(Hash::check('password', $user->fresh()->password));
            }
            $this->put(route('user-password.update'), [
                'current_password' => 'password',
                'password' => 'New-secure-password-42!',
                'password_confirmation' => 'New-secure-password-42!',
            ])->assertSessionHasNoErrors();
            $this->assertTrue(Hash::check('New-secure-password-42!', $user->fresh()->password));
        }
    }

    public function test_confirmation_endpoint_rejects_wrong_password_and_limits_attempts(): void
    {
        if (! Route::has('password.confirm.store')) {
            $this->markTestSkipped('Confirmation removed.');
        }
        $this->actingAs(User::factory()->create());
        for ($i = 0; $i < 5; $i++) {
            $this->postJson(route('password.confirm.store'), ['password' => 'wrong'])->assertUnprocessable()
                ->assertSessionMissing('auth.password_confirmed_at')->assertSessionMissing('_old_input.password');
        }
        $this->postJson(route('password.confirm.store'), ['password' => 'password'])->assertTooManyRequests();
    }

    public function test_passkey_name_validation_precedes_confirmation_without_creating_credentials_or_consuming_options(): void
    {
        if (! Route::has('passkey.store')) {
            $this->markTestSkipped('Passkeys removed.');
        }
        $this->actingAs(User::factory()->create())
            ->withSession(['passkey.registration_options' => 'untouched-options']);
        $headers = ['Precognition' => 'true', 'Precognition-Validate-Only' => 'name'];
        foreach (['', '   ', str_repeat('x', 256)] as $name) {
            $this->postJson(route('passkey.store'), ['name' => $name], $headers)
                ->assertUnprocessable()->assertJsonValidationErrors('name')
                ->assertJsonMissingValidationErrors('credential')
                ->assertSessionHas('passkey.registration_options', 'untouched-options')
                ->assertSessionMissing('auth.password_confirmed_at');
        }
        $this->postJson(route('passkey.store'), ['name' => str_repeat('x', 255)], $headers)
            ->assertNoContent()->assertHeader('Precognition-Success', 'true')
            ->assertSessionHas('passkey.registration_options', 'untouched-options')
            ->assertSessionMissing('auth.password_confirmed_at');
        $this->assertDatabaseCount('passkeys', 0);

        // A validation success cannot authorize an actual registration or options request.
        if (config('fortify.password_confirmation')) {
            $this->postJson(route('passkey.store'), ['name' => 'Valid name'])->assertStatus(423);
            $this->getJson(route('passkey.registration-options'), $headers)->assertStatus(423);
        }

        $this

            ->withSession(['auth.password_confirmed_at' => time()])

            ->postJson(route('passkey.store'), ['name' => ''])->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->assertDatabaseCount('passkeys', 0);
    }

    public function test_passkey_name_validation_has_a_separate_throttle_from_registration(): void
    {
        if (! Route::has('passkey.store')) {
            $this->markTestSkipped('Passkeys removed.');
        }
        $this->actingAs(User::factory()->create());
        for ($i = 0; $i < 30; $i++) {
            $this->postJson(route('passkey.store'), ['name' => 'My passkey'], ['Precognition' => 'true', 'Precognition-Validate-Only' => 'name'])
                ->assertNoContent();
        }
        $this->postJson(route('passkey.store'), ['name' => 'My passkey'], ['Precognition' => 'true', 'Precognition-Validate-Only' => 'name'])
            ->assertTooManyRequests();
        $this

            ->withSession(['auth.password_confirmed_at' => time()])

            ->getJson(route('passkey.registration-options'))->assertOk();
    }

    public function test_confirmation_authorizes_actions_only_until_the_configured_timeout(): void
    {
        if (! Route::has('password.confirm.store')) {
            $this->markTestSkipped('Confirmation removed.');
        }
        Notification::fake();
        $this->actingAs(User::factory()->create());
        $this->postJson(route('profile.email.store'), ['email' => 'new@example.com'])->assertStatus(423);
        $this->postJson(route('password.confirm.store'), ['password' => 'password'])->assertCreated();
        $this->getJson(route('password.confirmation'))->assertJsonPath('confirmed', true);
        $this->post(route('profile.email.store'), ['email' => 'new@example.com'])->assertSessionHasNoErrors();
        $this->travel((int) config('auth.password_timeout') + 1)->seconds();
        $this->getJson(route('password.confirmation'))->assertJsonPath('confirmed', false);
        $this->postJson(route('profile.email.store'), ['email' => 'other@example.com'])->assertStatus(423);
        $this->deleteJson(route('profile.destroy'))->assertStatus(423);
    }

    public function test_two_factor_actions_and_secret_reads_follow_the_installed_policy(): void
    {
        if (! Route::has('two-factor.enable')) {
            $this->markTestSkipped('2FA removed.');
        }
        $user = User::factory()->create();
        $this->actingAs($user);

        $enabled = config('fortify.password_confirmation');
        if ($enabled) {
            $this->postJson(route('two-factor.enable'))->assertStatus(423);
            foreach (['two-factor.qr-code', 'two-factor.secret-key', 'two-factor.recovery-codes'] as $route) {
                $this->getJson(route($route))->assertStatus(423);
            }
            $this->assertNull($user->fresh()->two_factor_secret);
            $this->postJson(route('password.confirm.store'), ['password' => 'password'])->assertCreated();
        }

        $this->postJson(route('two-factor.enable'))->assertSuccessful();
        $secret = decrypt($user->fresh()->two_factor_secret);
        $this->getJson(route('two-factor.qr-code'))->assertOk();
        $this->getJson(route('two-factor.secret-key'))->assertOk()->assertJsonPath('secretKey', $secret);
        $otp = app(Google2FA::class)->getCurrentOtp($secret);
        $this->postJson(route('two-factor.confirm'), ['code' => $otp])->assertSuccessful();
        $this->getJson(route('two-factor.recovery-codes'))->assertOk();
        $oldCodes = $user->fresh()->two_factor_recovery_codes;
        $this->postJson(route('two-factor.regenerate-recovery-codes'))->assertSuccessful();
        $this->assertNotSame($oldCodes, $user->fresh()->two_factor_recovery_codes);

        if ($enabled) {
            $this->travel((int) config('auth.password_timeout') + 1)->seconds();
            $this->getJson(route('two-factor.recovery-codes'))->assertStatus(423);
            $this->postJson(route('two-factor.regenerate-recovery-codes'))->assertStatus(423);
            $this->deleteJson(route('two-factor.disable'))->assertStatus(423);
            $this->assertNotNull($user->fresh()->two_factor_secret);
            $this->postJson(route('password.confirm.store'), ['password' => 'password'])->assertCreated();
        }

        $this->deleteJson(route('two-factor.disable'))->assertSuccessful();
        $this->assertNull($user->fresh()->two_factor_secret);
    }

    public function test_viewing_security_preserves_unfinished_two_factor_setup(): void
    {
        if (! Route::has('two-factor.enable')) {
            $this->markTestSkipped('2FA removed.');
        }
        $user = User::factory()->create();
        app(EnableTwoFactorAuthentication::class)($user);
        $secret = $user->fresh()->two_factor_secret;
        $this->actingAs($user)->get(route('security.edit'))->assertOk();
        $this->travel(10)->seconds();
        $this->get(route('security.edit'))->assertOk();
        $this->assertSame($secret, $user->fresh()->two_factor_secret);
    }

    public function test_disabled_confirmation_allows_email_changes_without_a_password(): void
    {
        config(['fortify.password_confirmation' => false]);
        Notification::fake();
        $user = User::factory()->create();
        $original = $user->email;
        $this->actingAs($user)->post(route('profile.email.store'), ['email' => 'new@example.com'])->assertSessionHasNoErrors();
        $this->assertSame($original, $user->fresh()->email);
        $this->assertDatabaseHas('pending_email_changes', ['user_id' => $user->id, 'email' => 'new@example.com']);
    }

    public function test_passkey_registration_confirmation_and_removal_follow_the_installed_policy(): void
    {
        if (! Route::has('passkey.store')) {
            $this->markTestSkipped('Passkeys removed.');
        }
        $origin = config('app.url');
        config(['passkeys.relying_party_id' => parse_url($origin, PHP_URL_HOST), 'passkeys.allowed_origins' => [$origin]]);
        $user = User::factory()->create();
        $this->actingAs($user);

        $enabled = config('fortify.password_confirmation');
        if ($enabled) {
            $this->getJson(route('passkey.registration-options'))->assertStatus(423);
            $this->postJson(route('passkey.store'), [])->assertStatus(423);
            $this->postJson(route('password.confirm.store'), ['password' => 'password'])->assertCreated();
        }

        $options = $this->getJson(route('passkey.registration-options'))->assertOk()->json('options');
        $authenticator = new PasskeyAuthenticator;
        $this->postJson(route('passkey.store'), ['name' => 'Test passkey', 'credential' => $authenticator->register($options, $origin)])->assertSuccessful();
        $passkey = $user->passkeys()->firstOrFail();
        $this->get(route('security.edit'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('passkeys.0.name', 'Test passkey')->missing('passkeys.0.credential'));

        if ($enabled) {
            $this->travel((int) config('auth.password_timeout') + 1)->seconds();
            $this->deleteJson(route('passkey.destroy', $passkey))->assertStatus(423);
            $options = $this->getJson(route('passkey.confirm-options'))->assertOk()->json('options');
            $this->postJson(route('passkey.confirm'), ['credential' => $authenticator->verify($options, $origin)])->assertSuccessful();
            $this->getJson(route('password.confirmation'))->assertJsonPath('confirmed', true);
        }

        $this->deleteJson(route('passkey.destroy', $passkey))->assertSuccessful();
        $this->assertDatabaseMissing('passkeys', ['id' => $passkey->id]);
    }
}
