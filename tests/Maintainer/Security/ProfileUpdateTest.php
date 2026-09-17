<?php

namespace Tests\Maintainer\Security;

use App\Models\User;
/* @chisel-email-verification */
use Illuminate\Contracts\Auth\MustVerifyEmail;
/* @end-chisel-email-verification */
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_can_access_profile_with_the_correct_verification_requirement(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/profile')
                /* @chisel-email-verification */
                ->where('mustVerifyEmail', $user instanceof MustVerifyEmail)
                /* @end-chisel-email-verification */
                ->where('auth.user.email_verified_at', null));
    }

    public function test_unverified_user_can_delete_only_when_email_verification_was_removed(): void
    {
        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->deleteJson(route('profile.destroy'));

        /* @chisel-email-verification */
        if ($user instanceof MustVerifyEmail) {
            $response->assertForbidden();
            $this->assertNotNull($user->fresh());
            $this->assertAuthenticatedAs($user);

            return;
        }
        /* @end-chisel-email-verification */

        $response->assertRedirect(route('home'));
        $this->assertNull($user->fresh());
        $this->assertGuest();
    }

    public function test_deletion_requires_confirmation_only_when_the_option_is_enabled(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->deleteJson(route('profile.destroy'));

        if (config('fortify.password_confirmation')) {
            $response->assertStatus(423);
            $this->assertNotNull($user->fresh());
        } else {
            $response->assertRedirect(route('home'));
            $this->assertNull($user->fresh());
        }
    }
}
