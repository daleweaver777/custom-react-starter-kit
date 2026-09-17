<?php

namespace Tests\Maintainer\Security;

use App\Models\User;
use Illuminate\Contracts\Validation\UncompromisedVerifier;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
/* @chisel-registration */
use Laravel\Fortify\Features;
/* @end-chisel-registration */
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PasswordPolicyConfigurationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Keep the normal test CSRF bypass when exercising production password rules.
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    public static function policies(): array
    {
        return [
            'testing default' => ['testing', 255],
            'production default' => ['production', 255],
            'testing custom maximum' => ['testing', 100],
            'production custom maximum' => ['production', 100],
        ];
    }

    #[DataProvider('policies')]
    public function test_password_manager_hints_and_input_validation_share_the_configured_maximum(string $environment, int $maximum): void
    {
        $user = User::factory()->create();
        $this->app->instance('env', $environment);
        config(['auth.password_max_length' => $maximum]);
        $minimum = $environment === 'production' ? 12 : 1;
        $expected = "minlength: $minimum; maxlength: $maximum;";
        if ($environment === 'production') {
            $expected .= ' required: lower; required: upper; required: digit; required: special;';
        }

        /* @chisel-registration */
        if (Features::enabled(Features::registration())) {
            $this->get(route('register'))->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('auth/register')->where('passwordRules', $expected));
        }
        /* @end-chisel-registration */
        $this->get(route('password.reset', ['token' => 'policy-test', 'email' => $user->email]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/reset-password')->where('passwordRules', $expected));

        $oversized = str_repeat('a', $maximum + 1);
        $this->postJson(route('login.store'), ['email' => $user->email, 'password' => $oversized])
            ->assertUnprocessable()->assertJsonValidationErrors([
                'password' => "The password field must not be greater than $maximum characters.",
            ]);
        $this->assertGuest();

        $this->actingAs($user)->get(route('security.edit'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/security')->where('passwordRules', $expected));

        // Length rejection must happen before the compromised-password lookup.
        $this->mock(UncompromisedVerifier::class)->shouldNotReceive('verify');
        $this->putJson(route('user-password.update'), [
            'current_password' => 'password',
            'password' => $oversized,
            'password_confirmation' => $oversized,
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'password' => "The new password field must not be greater than $maximum characters.",
            'password_confirmation' => "The confirm password field must not be greater than $maximum characters.",
        ]);
        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_development_accepts_a_single_character_new_password(): void
    {
        $user = User::factory()->create();
        $this->app->instance('env', 'local');
        $this->mock(UncompromisedVerifier::class)->shouldNotReceive('verify');

        $this->actingAs($user)->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'x',
            'password_confirmation' => 'x',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertTrue(Hash::check('x', $user->refresh()->password));

        $this->putJson(route('user-password.update'), [
            'current_password' => 'x',
            'password' => '',
            'password_confirmation' => '',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertTrue(Hash::check('x', $user->refresh()->password));
    }

    public function test_production_strength_checks_apply_only_to_new_passwords(): void
    {
        $user = User::factory()->create(['password' => 'old']);
        $this->app->instance('env', 'production');
        $verifier = $this->mock(UncompromisedVerifier::class);
        $verifier->shouldReceive('verify')->once()->with([
            'value' => 'ReplacementStrong42!', 'threshold' => 0,
        ])->andReturnTrue();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'old'])
            ->assertSessionHasNoErrors()->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticatedAs($user);

        if (config('fortify.password_confirmation', true)) {
            $this->postJson(route('password.confirm.store'), ['password' => 'old'])->assertCreated();
        }

        $this->putJson(route('user-password.update'), [
            'current_password' => 'old',
            'password' => 'short123',
            'password_confirmation' => 'short123',
        ])->assertUnprocessable()->assertJsonValidationErrors('password')
            ->assertJsonMissingValidationErrors(['current_password', 'password_confirmation']);
        $this->assertTrue(Hash::check('old', $user->refresh()->password));

        $this->put(route('user-password.update'), [
            'current_password' => 'old',
            'password' => 'ReplacementStrong42!',
            'password_confirmation' => 'ReplacementStrong42!',
        ])->assertSessionHasNoErrors()->assertRedirect();
        $this->assertTrue(Hash::check('ReplacementStrong42!', $user->refresh()->password));
    }

    public function test_production_rejects_compromised_new_passwords(): void
    {
        $user = User::factory()->create();
        $this->app->instance('env', 'production');
        $this->mock(UncompromisedVerifier::class)->shouldReceive('verify')->once()->with([
            'value' => 'CompromisedPassword42!', 'threshold' => 0,
        ])->andReturnFalse();

        $this->actingAs($user)->putJson(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'CompromisedPassword42!',
            'password_confirmation' => 'CompromisedPassword42!',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }
}
