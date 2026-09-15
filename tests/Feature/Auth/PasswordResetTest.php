<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Fortify\Features;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::resetPasswords());
    }

    public function test_reset_password_link_screen_can_be_rendered()
    {
        $response = $this->get(route('password.request'));

        $response->assertOk();
    }

    public function test_reset_password_link_can_be_requested()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    #[DataProvider('responseFormats')]
    public function test_reset_link_responses_do_not_disclose_account_existence(bool $json): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'test@example.com']);
        $message = 'If an account exists with that email address, you’ll receive a password reset link shortly.';

        // Unknown, sent, throttled (including mixed case), and unknown again.
        foreach (['missing@example.com', $user->email, 'TEST@EXAMPLE.COM', 'missing@example.com'] as $index => $email) {
            $response = $json
                ? $this->postJson(route('password.email'), ['email' => $email])
                : $this->from(route('password.request'))->post(route('password.email'), ['email' => $email]);

            if ($json) {
                $response->assertOk()->assertExactJson(['message' => $message]);
            } else {
                $response->assertRedirect(route('password.request'))
                    ->assertSessionHas('status', $message)
                    ->assertSessionHasNoErrors()
                    ->assertSessionMissing('_old_input');

                $this->get(route('password.request'))->assertInertia(fn ($page) => $page
                    ->component('auth/forgot-password')
                    ->where('status', $message)
                    ->where('errors', []));
            }

            Notification::assertCount($index === 0 ? 0 : 1);
            $this->assertDatabaseCount('password_reset_tokens', $index === 0 ? 0 : 1);
        }

        // A throttled request must leave the previously emailed token usable.
        $notification = Notification::sent($user, ResetPassword::class)->sole();
        $this->assertTrue(Password::tokenExists($user, $notification->token));

        $this->travel(61)->seconds();
        $this->postJson(route('password.email'), ['email' => $user->email])
            ->assertOk()->assertExactJson(['message' => $message]);
        Notification::assertSentToTimes($user, ResetPassword::class, 2);
        $this->assertFalse(Password::tokenExists($user, $notification->token));
    }

    public static function responseFormats(): array
    {
        return [
            'JSON' => [true],
            'browser' => [false],
        ];
    }

    #[DataProvider('invalidResetEmails')]
    public function test_invalid_reset_email_still_returns_validation_errors(mixed $email, bool $json): void
    {
        Notification::fake();

        if ($json) {
            $this->postJson(route('password.email'), ['email' => $email])
                ->assertUnprocessable()->assertJsonValidationErrors('email');
        } else {
            $this->from(route('password.request'))->post(route('password.email'), ['email' => $email])
                ->assertRedirect(route('password.request'))
                ->assertSessionHasErrors('email')
                ->assertSessionMissing('status');
        }

        Notification::assertNothingSent();
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public static function invalidResetEmails(): array
    {
        return [
            'missing JSON' => [null, true],
            'missing browser' => [null, false],
            'empty JSON' => ['', true],
            'empty browser' => ['', false],
            'malformed JSON' => ['not-an-email', true],
            'malformed browser' => ['not-an-email', false],
            'array JSON' => [['test@example.com'], true],
            'array browser' => [['test@example.com'], false],
        ];
    }

    public function test_reset_password_screen_can_be_rendered()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) {
            $response = $this->get(route('password.reset', $notification->token));

            $response->assertOk();

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token()
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->post(route('password.update'), [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            return true;
        });
    }

    public function test_password_cannot_be_reset_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('password.update'), [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_mixed_case_email_works_for_reset_requests_and_token_submission(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'test@example.com']);

        $this->post(route('password.email'), ['email' => 'Test@Example.COM'])
            ->assertSessionHasNoErrors();

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $this->post(route('password.update'), [
                'token' => $notification->token,
                'email' => 'TEST@EXAMPLE.COM',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])->assertSessionHasNoErrors()->assertRedirect(route('login'));

            $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
            $this->assertFalse(Password::tokenExists($user->fresh(), $notification->token));

            return true;
        });
    }

    public function test_password_mismatch_is_reported_on_confirmation(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);

        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'different-password',
        ])->assertSessionHasErrors('password_confirmation')
            ->assertSessionDoesntHaveErrors('password');

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }
}
