<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SessionRevocationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['session.driver' => 'database']);
    }

    public static function passwordChanges(): array
    {
        return [
            'session only' => [false, 'replacement-password'],
            'remembered' => [true, 'replacement-password'],
            'same password' => [false, 'password'],
            'remembered same password' => [true, 'password'],
        ];
    }

    #[DataProvider('passwordChanges')]
    public function test_password_change_revokes_other_browsers_and_rotates_the_current_session(bool $remember, string $password): void
    {
        $user = User::factory()->create();
        $current = $other = $unrelated = [];
        $login = $this->loginBrowser($current, $user, $remember);
        $oldSessionId = $login->getCookie(config('session.cookie'))->getValue();
        $oldCsrfToken = session()->token();
        $stolenCurrent = $current;
        $this->loginBrowser($other, $user, $remember);
        $stolenOther = $other;
        $rememberName = Auth::getRecallerName();
        $oldRememberToken = $user->refresh()->remember_token;

        // Leave the second browser idle after login: no page request may be needed to protect it.
        $this->loginBrowser($unrelated, User::factory()->create(), true);

        $response = $this->browserRequest($current, 'PUT', route('user-password.update'), [
            'current_password' => 'password',
            'password' => $password,
            'password_confirmation' => $password,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertTrue(Hash::check($password, $user->refresh()->password));
        $this->assertNotSame($oldRememberToken, $user->remember_token);
        $this->assertNotSame($oldSessionId, $response->getCookie(config('session.cookie'))->getValue());
        $this->assertNotSame($oldCsrfToken, session()->token());
        $this->assertDatabaseMissing('sessions', ['id' => $oldSessionId]);

        $this->browserRequest($current, 'GET', route('dashboard'))->assertOk();
        $this->assertAuthenticatedAs($user);
        $this->browserRequest($other, 'GET', route('profile.edit'))->assertRedirect(route('login'));
        $this->assertGuest();
        $this->browserRequest($stolenOther, 'GET', route('dashboard'))->assertRedirect(route('login'));
        $this->browserRequest($stolenCurrent, 'GET', route('dashboard'))->assertRedirect(route('login'));
        $this->browserRequest($unrelated, 'GET', route('dashboard'))->assertOk();

        if ($remember) {
            $oldRememberOnly = [$rememberName => $stolenOther[$rememberName]];
            $this->browserRequest($oldRememberOnly, 'GET', route('dashboard'))->assertRedirect(route('login'));
            $currentRememberOnly = [$rememberName => $current[$rememberName]];
            $this->browserRequest($currentRememberOnly, 'GET', route('dashboard'))->assertOk();
            $this->assertAuthenticatedAs($user);
        } else {
            $this->assertArrayNotHasKey($rememberName, $current);
        }
    }

    #[DataProvider('passwordChanges')]
    public function test_password_reset_revokes_all_browsers_and_remembered_credentials(bool $remember, string $password): void
    {
        $user = User::factory()->create();
        $first = $second = $recovery = [];
        $this->loginBrowser($first, $user, $remember);
        $this->browserRequest($first, 'GET', route('dashboard'))->assertOk();
        $this->loginBrowser($second, $user, $remember);
        $rememberName = Auth::getRecallerName();
        $oldRememberToken = $user->refresh()->remember_token;
        $oldRememberOnly = $remember ? [$rememberName => $second[$rememberName]] : [];

        $this->browserRequest($recovery, 'POST', route('password.update'), [
            'token' => Password::createToken($user),
            'email' => $user->email,
            'password' => $password,
            'password_confirmation' => $password,
        ])->assertSessionHasNoErrors()->assertRedirect(route('login'));

        $this->assertGuest();
        $this->assertTrue(Hash::check($password, $user->refresh()->password));
        $this->assertNotSame($oldRememberToken, $user->remember_token);
        $this->browserRequest($first, 'GET', route('dashboard'))->assertRedirect(route('login'));
        $this->browserRequest($second, 'GET', route('profile.edit'))->assertRedirect(route('login'));
        $this->browserRequest($recovery, 'GET', route('dashboard'))->assertRedirect(route('login'));

        if ($remember) {
            $this->browserRequest($oldRememberOnly, 'GET', route('dashboard'))->assertRedirect(route('login'));
            $this->assertGuest();
        }

        $this->loginBrowser($recovery, $user, false, $password);
        $this->browserRequest($recovery, 'GET', route('dashboard'))->assertOk();
    }

    public function test_failed_password_changes_and_resets_do_not_revoke_sessions(): void
    {
        $user = User::factory()->create();
        $first = $second = $recovery = [];
        $login = $this->loginBrowser($first, $user, true);
        $sessionId = $login->getCookie(config('session.cookie'))->getValue();
        $this->loginBrowser($second, $user, true);
        $rememberToken = $user->refresh()->remember_token;

        $response = $this->browserRequest($first, 'PUT', route('user-password.update'), [
            'current_password' => 'wrong-password',
            'password' => 'replacement-password',
            'password_confirmation' => 'replacement-password',
        ])->assertSessionHasErrors('current_password');

        $this->assertSame($sessionId, $response->getCookie(config('session.cookie'))->getValue());
        $this->browserRequest($recovery, 'POST', route('password.update'), [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'replacement-password',
            'password_confirmation' => 'replacement-password',
        ])->assertSessionHasErrors('email');

        $this->assertSame($rememberToken, $user->refresh()->remember_token);
        $this->browserRequest($first, 'GET', route('dashboard'))->assertOk();
        $this->browserRequest($second, 'GET', route('dashboard'))->assertOk();
    }

    public function test_a_browser_restored_from_remember_me_can_change_its_password(): void
    {
        $user = User::factory()->create();
        $browser = [];
        $this->loginBrowser($browser, $user, true);
        $rememberName = Auth::getRecallerName();
        $browser = [$rememberName => $browser[$rememberName]];

        $this->browserRequest($browser, 'PUT', route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'replacement-password',
            'password_confirmation' => 'replacement-password',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->browserRequest($browser, 'GET', route('dashboard'))->assertOk();
        $rememberOnly = [$rememberName => $browser[$rememberName]];
        $this->browserRequest($rememberOnly, 'GET', route('dashboard'))->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_revocation_also_works_with_cookie_sessions(): void
    {
        config(['session.driver' => 'cookie']);

        $user = User::factory()->create();
        $first = $second = [];
        $this->loginBrowser($first, $user, false);
        $this->loginBrowser($second, $user, false);

        $this->browserRequest($first, 'PUT', route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'replacement-password',
            'password_confirmation' => 'replacement-password',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->browserRequest($first, 'GET', route('dashboard'))->assertOk();
        $this->browserRequest($second, 'GET', route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    private function loginBrowser(array &$cookies, User $user, bool $remember, string $password = 'password'): TestResponse
    {
        $response = $this->browserRequest($cookies, 'POST', route('login.store'), [
            'email' => $user->email,
            'password' => $password,
            'remember' => $remember,
        ])->assertSessionHasNoErrors()->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);

        return $response;
    }

    /**
     * Send real encrypted cookies through the HTTP stack, with fresh request-scoped state.
     * Each cookie jar represents an independent browser; no actingAs session shortcuts.
     */
    private function browserRequest(array &$cookies, string $method, string $url, array $data = []): TestResponse
    {
        Auth::forgetGuards();
        session()->flush();
        session()->setId(null);
        session()->setExists(false);

        foreach (app('router')->getRoutes() as $route) {
            $route->flushController();
        }
        foreach (app('cookie')->getQueuedCookies() as $cookie) {
            app('cookie')->unqueue($cookie->getName(), $cookie->getPath());
        }

        $response = $this->call($method, $url, $data, $cookies);

        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getExpiresTime() !== 0 && $cookie->getExpiresTime() <= time()) {
                unset($cookies[$cookie->getName()]);
            } else {
                $cookies[$cookie->getName()] = $cookie->getValue();
            }
        }

        return $response;
    }
}
