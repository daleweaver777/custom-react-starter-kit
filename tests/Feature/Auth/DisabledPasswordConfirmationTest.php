<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Providers\FortifyServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class DisabledPasswordConfirmationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['fortify.password_confirmation' => false]);
        $this->app->getProvider(FortifyServiceProvider::class)->boot();
    }

    public function test_disabled_password_confirmation_routes_are_not_registered(): void
    {
        foreach (['password.confirm', 'password.confirm.store', 'password.confirmation'] as $name) {
            $this->assertFalse(Route::has($name));
        }

        $this->assertTrue(Route::has('login'));
        $this->assertTrue(Route::has('password.request'));
        $this->assertTrue(Route::has('password.reset'));
    }

    public function test_disabled_password_confirmation_endpoints_return_not_found_for_guests(): void
    {
        $this->get('/user/confirm-password')->assertNotFound();
        $this->post('/user/confirm-password', ['password' => 'password'])->assertNotFound();
        $this->get('/user/confirmed-password-status')->assertNotFound();
    }

    public function test_disabled_password_confirmation_endpoints_return_not_found_when_authenticated(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/user/confirm-password')->assertNotFound();
        $this->post('/user/confirm-password', ['password' => 'password'])->assertNotFound();
        $this->get('/user/confirmed-password-status')->assertNotFound();
    }
}
