<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Fortify;
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

    public function test_validation_precedes_the_custom_fortify_confirmation_callback(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $originalCallback = Fortify::$confirmPasswordsUsingCallback;
        $calls = [];

        Fortify::confirmPasswordsUsing(function ($confirmedUser, $password) use ($user, &$calls): bool {
            $this->assertTrue($user->is($confirmedUser));
            $calls[] = $password;

            return $password === 'custom-confirmation';
        });

        try {
            foreach ([['invalid'], str_repeat('a', 256)] as $password) {
                $this->postJson(route('password.confirm.store'), ['password' => $password])
                    ->assertUnprocessable()->assertJsonValidationErrors('password')
                    ->assertSessionMissing('auth.password_confirmed_at');
            }
            $this->assertSame([], $calls);

            $this->postJson(route('password.confirm.store'), ['password' => 'wrong'])
                ->assertUnprocessable()->assertJsonPath('errors.password.0', 'The provided password was incorrect.')
                ->assertSessionMissing('auth.password_confirmed_at');

            $this->postJson(route('password.confirm.store'), ['password' => 'custom-confirmation'])
                ->assertCreated()->assertSessionHas('auth.password_confirmed_at');

            $this->assertSame(['wrong', 'custom-confirmation'], $calls);
        } finally {
            Fortify::$confirmPasswordsUsingCallback = $originalCallback;
        }
    }
}
