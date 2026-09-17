<?php

namespace Tests\Maintainer\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_security_page_does_not_require_password_confirmation_when_enabled()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->get(route('security.edit'));

        $response->assertOk();
    }

    public function test_security_page_renders_when_optional_features_are_disabled()
    {
        config(['fortify.features' => []]);

        $user = User::factory()->create();

        $this->actingAs($user)

            ->withSession(['auth.password_confirmed_at' => time()])

            ->get(route('security.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/security')

                ->where('canManagePasskeys', false)
                ->where('passkeys', [])

                ->where('canManageTwoFactor', false)
                ->missing('twoFactorEnabled')
                ->missing('requiresConfirmation')

            );
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
