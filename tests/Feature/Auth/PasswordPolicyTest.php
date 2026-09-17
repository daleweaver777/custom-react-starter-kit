<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
/* @chisel-registration */
use Laravel\Fortify\Features;
/* @end-chisel-registration */
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PasswordPolicyTest extends TestCase
{
    use RefreshDatabase;

    public static function acceptedPasswords(): array
    {
        $cases = [];

        foreach ([
            /* @chisel-registration */
            'registration',
            /* @end-chisel-registration */
            'reset',
            'update',
        ] as $flow) {
            foreach (['ASCII' => 'a', 'Unicode' => '🔐'] as $label => $character) {
                $cases["$flow $label"] = [$flow, 'Aa1!'.str_repeat($character, 251)];
            }
        }

        return $cases;
    }

    #[DataProvider('acceptedPasswords')]
    public function test_full_255_character_passwords_are_stored_and_verified(string $flow, string $password): void
    {
        Notification::fake();
        $this->assertSame('argon2id', config('hashing.driver'));
        $this->assertTrue((bool) config('hashing.argon.verify'));
        $this->assertSame(255, mb_strlen($password));
        $input = ['password' => $password, 'password_confirmation' => $password];

        switch ($flow) {
            /* @chisel-registration */
            case 'registration':
                $this->skipUnlessFortifyHas(Features::registration());
                $this->post(route('register.store'), [
                    ...$input,
                    'name' => 'Password Policy',
                    'email' => 'policy@example.com',
                ])->assertSessionHasNoErrors();
                $user = User::sole();
                break;
                /* @end-chisel-registration */
            default:
                $currentPassword = str_repeat('o', 255);
                $user = User::factory()->create(['password' => $currentPassword]);

                if ($flow === 'reset') {
                    $this->post(route('password.update'), [
                        ...$input,
                        'email' => $user->email,
                        'token' => Password::createToken($user),
                    ])->assertSessionHasNoErrors()->assertRedirect(route('login'));
                } else {
                    $this->actingAs($user)->put(route('user-password.update'), [
                        ...$input,
                        'current_password' => $currentPassword,
                    ])->assertSessionHasNoErrors()->assertRedirect();
                }
                break;
        }

        $hash = $user->refresh()->password;
        $this->assertSame('argon2id', Hash::info($hash)['algoName']);
        $this->assertTrue(Hash::check($password, $hash));
        $differentSuffix = mb_substr($password, 0, 254).'Z';
        $this->assertSame(substr($password, 0, 72), substr($differentSuffix, 0, 72));
        $this->assertFalse(Hash::check($differentSuffix, $hash));

        Auth::logout();
        $this->flushSession();
        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => $differentSuffix,
        ])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->flushSession();
        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => $password,
        ])->assertSessionHasNoErrors()->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticatedAs($user);

        /* @chisel-password-confirmation */
        if (config('fortify.password_confirmation', true)) {
            $this->postJson(route('password.confirm.store'), ['password' => $differentSuffix])
                ->assertUnprocessable()->assertJsonValidationErrors('password');
            $this->postJson(route('password.confirm.store'), ['password' => $password])
                ->assertCreated();
        }
        /* @end-chisel-password-confirmation */
    }

    public static function oversizedPasswords(): array
    {
        $cases = [];
        $fields = [
            /* @chisel-registration */
            'registration' => ['password', 'password_confirmation'],
            /* @end-chisel-registration */
            'reset' => ['password', 'password_confirmation'],
            'update' => ['password', 'password_confirmation', 'current_password'],
            'login' => ['password'],
            /* @chisel-password-confirmation */
            'confirmation' => ['password'],
            /* @end-chisel-password-confirmation */
        ];

        foreach ($fields as $flow => $passwordFields) {
            foreach ($passwordFields as $field) {
                foreach (['ASCII' => 'a', 'Unicode' => '🔐'] as $label => $character) {
                    foreach ([false, true] as $json) {
                        $cases["$flow $field $label ".($json ? 'JSON' : 'browser')] = [
                            $flow, $field, str_repeat($character, 256), $json,
                        ];
                    }
                }
            }
        }

        return $cases;
    }

    #[DataProvider('oversizedPasswords')]
    public function test_oversized_password_fields_are_rejected_without_changing_credentials(
        string $flow,
        string $field,
        string $password,
        bool $json,
    ): void {
        /* @chisel-registration */
        if ($flow === 'registration') {
            $this->skipUnlessFortifyHas(Features::registration());
        }
        /* @end-chisel-registration */
        /* @chisel-password-confirmation */
        if ($flow === 'confirmation' && ! config('fortify.password_confirmation', true)) {
            $this->markTestSkipped('Password confirmation is not enabled.');
        }
        /* @end-chisel-password-confirmation */

        Notification::fake();
        $user = User::factory()->create();
        $originalHash = $user->password;
        $input = [
            'password' => 'valid-password',
            'password_confirmation' => 'valid-password',
        ];
        $method = 'POST';

        switch ($flow) {
            /* @chisel-registration */
            case 'registration':
                $route = 'register.store';
                $input += ['name' => 'Password Policy', 'email' => 'policy@example.com'];
                break;
                /* @end-chisel-registration */
            case 'reset':
                $route = 'password.update';
                $input += ['email' => $user->email, 'token' => Password::createToken($user)];
                break;
            case 'update':
                $route = 'user-password.update';
                $method = 'PUT';
                $input['current_password'] = 'password';
                $this->actingAs($user);
                break;
                /* @chisel-password-confirmation */
            case 'confirmation':
                $route = 'password.confirm.store';
                $this->actingAs($user);
                break;
                /* @end-chisel-password-confirmation */
            default:
                $route = 'login.store';
                $input = ['email' => $user->email];
                break;
        }

        $input[$field] = $password;
        $realHasher = Hash::getFacadeRoot();
        $hasher = Mockery::mock($realHasher);
        $hasher->shouldNotReceive('make');
        $hasher->shouldReceive('check')->andReturnUsing(function ($value, $hash, $options = []) use ($password, $realHasher) {
            $this->assertNotSame($password, $value, 'Oversized input must not reach password verification.');

            return $realHasher->check($value, $hash, $options);
        });
        Hash::swap($hasher);
        $response = $json
            ? $this->json($method, route($route), $input)
            : $this->call($method, route($route), $input);
        $attribute = match ($field) {
            'password_confirmation' => $flow === 'update' ? 'confirm password' : 'password confirmation',
            'current_password' => 'current password',
            default => $flow === 'update' ? 'new password' : 'password',
        };
        $message = "The $attribute field must not be greater than 255 characters.";

        if ($json) {
            $response->assertUnprocessable()->assertJsonValidationErrors([$field => $message]);
        } else {
            $response->assertRedirect()->assertSessionHasErrors([$field => $message]);
        }

        $this->assertSame($originalHash, $user->refresh()->password);
        $this->assertDatabaseCount('users', 1);
        if (in_array($flow, [
            /* @chisel-registration */
            'registration',
            /* @end-chisel-registration */
            'login',
            'reset',
        ], true)) {
            $this->assertGuest();
        }
        /* @chisel-password-confirmation */
        if ($flow === 'confirmation') {
            $response->assertSessionMissing('auth.password_confirmed_at');
        }
        /* @end-chisel-password-confirmation */
    }
}
