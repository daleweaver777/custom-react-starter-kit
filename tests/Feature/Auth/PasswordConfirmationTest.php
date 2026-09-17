<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
/* @chisel-passkeys */
use Illuminate\Support\Facades\DB;
/* @end-chisel-passkeys */
use Inertia\Testing\AssertableInertia as Assert;
/* @chisel-passkeys */
use Laravel\Fortify\Features;
/* @end-chisel-passkeys */
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

    public function test_confirmation_status_requires_authentication(): void
    {
        $this->getJson(route('password.confirmation'))->assertUnauthorized();
    }

    /* @chisel-passkeys */
    public function test_passkey_confirmation_availability_follows_the_current_users_credentials(): void
    {
        $this->skipUnlessFortifyHas(Features::passkeys());
        $user = User::factory()->create();
        $other = User::factory()->create();
        $this->insertPasskey($other);
        $this->actingAs($user);

        $this->assertPasskeyAvailability(false);
        $id = $this->insertPasskey($user);
        $this->assertPasskeyAvailability(true);
        DB::table('passkeys')->where('id', $id)->delete();
        $this->assertPasskeyAvailability(false);
    }

    public function test_recent_confirmation_skips_passkey_lookup_and_preserves_expiry_header(): void
    {
        $this->skipUnlessFortifyHas(Features::passkeys());
        $this->freezeTime();
        $user = User::factory()->create();
        $this->insertPasskey($user);
        $this->actingAs($user)->withSession(['auth.password_confirmed_at' => now()->subSeconds(42)->timestamp]);
        DB::enableQueryLog();
        DB::flushQueryLog();

        $this->getJson(route('password.confirmation'))->assertOk()
            ->assertExactJson(['confirmed' => true, 'canConfirmWithPasskey' => false])
            ->assertHeader('X-Retry-After', '42');
        $this->assertCount(0, $this->passkeyQueries());

        $this->travel((int) config('auth.password_timeout'))->seconds();
        DB::flushQueryLog();
        $this->getJson(route('password.confirmation'))->assertOk()
            ->assertExactJson(['confirmed' => false, 'canConfirmWithPasskey' => true])
            ->assertHeaderMissing('X-Retry-After');
        $queries = $this->passkeyQueries();
        $this->assertCount(1, $queries);
        $this->assertStringContainsString('exists', strtolower($queries[0]['query']));
    }

    public function test_ordinary_pages_do_not_query_passkey_availability(): void
    {
        $this->actingAs(User::factory()->create());
        DB::enableQueryLog();

        foreach (['dashboard', 'profile.edit', 'appearance.edit'] as $route) {
            DB::flushQueryLog();
            $this->get(route($route))->assertOk();
            $this->assertCount(0, $this->passkeyQueries(), $route);
        }
    }

    public function test_disabled_passkeys_do_not_query_credentials_or_offer_confirmation(): void
    {
        config(['fortify.features' => []]);
        $this->actingAs(User::factory()->create());
        DB::enableQueryLog();
        DB::flushQueryLog();

        $this->assertPasskeyAvailability(false);
        $this->assertCount(0, $this->passkeyQueries());
    }

    private function assertPasskeyAvailability(bool $available): void
    {
        $this->getJson(route('password.confirmation'))->assertOk()
            ->assertExactJson(['confirmed' => false, 'canConfirmWithPasskey' => $available]);
        $this->get(route('password.confirm'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/confirm-password')
                ->where('canConfirmWithPasskey', $available));
    }

    private function insertPasskey(User $user): int
    {
        // Only credential existence is exercised here; ceremony tests use PasskeyAuthenticator.
        return DB::table('passkeys')->insertGetId([
            'user_id' => $user->id,
            'name' => 'Test passkey',
            'credential_id' => bin2hex(random_bytes(16)),
            'credential' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function passkeyQueries(): array
    {
        return array_values(array_filter(DB::getQueryLog(),
            fn (array $query) => str_contains(strtolower($query['query']), 'passkeys')));
    }
    /* @end-chisel-passkeys */

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
