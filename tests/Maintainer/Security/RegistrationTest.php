<?php

namespace Tests\Maintainer\Security;

use App\Actions\Fortify\CreateNewUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());
    }

    public function test_password_mismatch_is_reported_on_confirmation(): void
    {
        $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'different-password',
        ])->assertSessionHasErrors('password_confirmation')
            ->assertSessionDoesntHaveErrors('password');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    public function test_registration_normalizes_email_before_storage_and_duplicate_validation(): void
    {
        Notification::fake();
        $input = [
            'name' => 'Test User',
            'email' => 'Test@Example.COM',
            'password' => 'password',
            'password_confirmation' => 'password',
        ];

        $this->post(route('register.store'), $input)->assertSessionHasNoErrors();
        $user = User::sole();
        $this->assertSame('test@example.com', $user->email);
        $this->assertAuthenticatedAs($user);

        Auth::logout();
        $this->flushSession();
        $input['email'] = 'TEST@EXAMPLE.COM';
        $this->post(route('register.store'), $input)->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 1);
    }

    public function test_direct_registration_normalizes_before_uniqueness_validation(): void
    {
        $input = [
            'name' => 'Test User',
            'email' => 'Test@Example.COM',
            'password' => 'password',
            'password_confirmation' => 'password',
        ];
        $creator = new CreateNewUser;
        $user = $creator->create($input);
        $this->assertSame('test@example.com', $user->fresh()->email);

        $input['email'] = 'TEST@EXAMPLE.COM';
        try {
            $creator->create($input);
            $this->fail('A case-variant duplicate must fail validation before insertion.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('email', $exception->errors());
        }
        $this->assertDatabaseCount('users', 1);
    }
}
