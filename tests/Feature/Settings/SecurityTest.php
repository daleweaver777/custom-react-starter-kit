<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_security_page_is_displayed()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            /* @chisel-password-confirmation */
            ->withSession(['auth.password_confirmed_at' => time()])
            /* @end-chisel-password-confirmation */
            ->get(route('security.edit'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/security')
                /* @chisel-passkeys */
                ->where('canManagePasskeys', true)
                ->where('passkeys', [])
                /* @end-chisel-passkeys */
                /* @chisel-2fa */
                ->where('canManageTwoFactor', true)
                ->where('twoFactorEnabled', false)
                /* @end-chisel-2fa */
            );
    }

    /* @chisel-password-confirmation */
    public function test_security_page_does_not_require_password_confirmation_when_enabled()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->get(route('security.edit'));

        $response->assertOk();
    }
    /* @end-chisel-password-confirmation */

    public function test_security_page_renders_when_optional_features_are_disabled()
    {
        config(['fortify.features' => []]);

        $user = User::factory()->create();

        $this->actingAs($user)
            /* @chisel-password-confirmation */
            ->withSession(['auth.password_confirmed_at' => time()])
            /* @end-chisel-password-confirmation */
            ->get(route('security.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/security')
                /* @chisel-passkeys */
                ->where('canManagePasskeys', false)
                ->where('passkeys', [])
                /* @end-chisel-passkeys */
                /* @chisel-2fa */
                ->where('canManageTwoFactor', false)
                ->missing('twoFactorEnabled')
                ->missing('requiresConfirmation')
                /* @end-chisel-2fa */
            );
    }

    public function test_password_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('security.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('security.edit'));

        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));
    }

    public function test_correct_password_must_be_provided_to_update_password()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('security.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasErrors('current_password')
            ->assertRedirect(route('security.edit'));
    }

    public function test_password_mismatch_is_reported_on_confirmation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('user-password.update'), [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'different-password',
            ])->assertSessionHasErrors([
                'password_confirmation' => 'The confirm password field must match new password.',
            ])
            ->assertSessionDoesntHaveErrors('password');

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_password_is_required(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('user-password.update'), [
                'current_password' => 'password',
                'password_confirmation' => 'new-password',
            ])->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }
}
