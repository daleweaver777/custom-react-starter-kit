<?php

namespace Tests\Maintainer\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_authenticate_with_mixed_case_email(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);

        $this->post(route('login.store'), [
            'email' => 'Test@Example.COM',
            'password' => 'password',
        ])->assertSessionHasNoErrors()->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
    }
}
