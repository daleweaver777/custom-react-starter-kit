<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
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

    public function test_browser_confirmation_redirects_to_the_intended_destination(): void
    {
        $this->actingAs(User::factory()->create())
            ->withSession(['url.intended' => route('security.edit')])
            ->post(route('password.confirm.store'), ['password' => 'password'])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('auth.password_confirmed_at')
            ->assertRedirect(route('security.edit'));
    }

    public function test_confirmation_submission_requires_authentication(): void
    {
        $this->postJson(route('password.confirm.store'), ['password' => 'password'])
            ->assertUnauthorized()->assertSessionMissing('auth.password_confirmed_at');

        $this->post(route('password.confirm.store'), ['password' => 'password'])
            ->assertRedirect(route('login'))->assertSessionMissing('auth.password_confirmed_at');
    }

    public static function invalidPasswords(): array
    {
        $cases = [];
        foreach ([
            'missing' => [[], 'The password field is required.'],
            'empty' => [['password' => ''], 'The password field is required.'],
            'null' => [['password' => null], 'The password field is required.'],
            'array' => [['password' => ['invalid']], 'The password field must be a string.'],
            'oversized' => [['password' => str_repeat('a', 256)], 'The password field must not be greater than 255 characters.'],
            'incorrect' => [['password' => 'wrong'], 'The password is incorrect.'],
        ] as $label => [$input, $message]) {
            foreach ([false, true] as $json) {
                $cases[$label.($json ? ' JSON' : ' browser')] = [$input, $message, $json];
            }
        }

        return $cases;
    }

    #[DataProvider('invalidPasswords')]
    public function test_invalid_passwords_do_not_confirm_identity(array $input, string $message, bool $json): void
    {
        $this->actingAs(User::factory()->create())->from(route('password.confirm'));
        $response = $json
            ? $this->postJson(route('password.confirm.store'), $input)
            : $this->post(route('password.confirm.store'), $input);

        if ($json) {
            $response->assertUnprocessable()->assertJsonValidationErrors(['password' => $message]);
        } else {
            $response->assertRedirect(route('password.confirm'))
                ->assertSessionHasErrors(['password' => $message]);
        }
        $response->assertSessionMissing('auth.password_confirmed_at')
            ->assertSessionMissing('_old_input.password');
    }
}
