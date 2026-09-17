<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PasswordConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirm_password_screen_can_be_rendered()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('password.confirm'));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('auth/confirm-password'),
        );
    }

    public function test_password_confirmation_requires_authentication()
    {
        $response = $this->get(route('password.confirm'));

        $response->assertRedirect(route('login'));
    }

    public function test_password_can_be_confirmed_and_its_status_is_available(): void
    {
        $this->actingAs(User::factory()->create());

        $this->getJson(route('password.confirmation'))
            ->assertOk()
            ->assertJson(['confirmed' => false]);

        $this->postJson(route('password.confirm.store'), ['password' => 'password'])
            ->assertCreated();

        $this->getJson(route('password.confirmation'))
            ->assertOk()
            ->assertJson(['confirmed' => true]);
    }
}
