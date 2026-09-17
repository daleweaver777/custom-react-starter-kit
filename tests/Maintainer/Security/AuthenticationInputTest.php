<?php

namespace Tests\Maintainer\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuthenticationInputTest extends TestCase
{
    use RefreshDatabase;

    public static function malformedValues(): array
    {
        return [
            'array' => [['bad']],
            'object' => [['nested' => 'bad']],
            'number' => [123],
            'boolean' => [true],
            'null' => [null],
        ];
    }

    #[DataProvider('malformedValues')]
    public function test_login_rejects_malformed_email_without_a_server_error(mixed $email): void
    {
        $this->postJson(route('login.store'), ['email' => $email, 'password' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    #[DataProvider('malformedValues')]
    public function test_passkey_login_rejects_malformed_credential_id_without_a_server_error(mixed $id): void
    {
        $this->postJson(route('passkey.login'), ['credential' => ['id' => $id]])
            ->assertUnprocessable()->assertJsonValidationErrors('credential.id');

        $this->assertGuest();
    }

    public function test_malformed_html_login_retains_validation_redirects(): void
    {
        $this->from(route('login'))->post(route('login.store'), ['email' => ['bad'], 'password' => 'password'])
            ->assertRedirect(route('login'))->assertSessionHasErrors('email');
    }

    public function test_malformed_login_attempts_still_consume_the_existing_limit(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson(route('login.store'), ['email' => ['bad'], 'password' => 'password'])
                ->assertUnprocessable();
        }

        $this->postJson(route('login.store'), ['email' => ['bad'], 'password' => 'password'])
            ->assertTooManyRequests();
    }
}
