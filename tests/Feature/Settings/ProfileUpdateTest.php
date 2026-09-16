<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_unverified_user_can_access_profile_with_the_correct_verification_requirement(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/profile')
                ->where('mustVerifyEmail', $user instanceof MustVerifyEmail)
                ->where('auth.user.email_verified_at', null));
    }

    public function test_unverified_user_can_delete_only_when_email_verification_was_removed(): void
    {
        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->deleteJson(route('profile.destroy'));

        if ($user instanceof MustVerifyEmail) {
            $response->assertForbidden();
            $this->assertNotNull($user->fresh());
            $this->assertAuthenticatedAs($user);
        } else {
            $response->assertRedirect(route('home'));
            $this->assertNull($user->fresh());
            $this->assertGuest();
        }
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('profile.destroy'));

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertNull($user->fresh());
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
