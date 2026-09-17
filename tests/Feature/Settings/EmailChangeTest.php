<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Notifications\VerifyEmailChange;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailChangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_changes_wait_for_confirmation_of_the_new_address(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $original = $user->email;

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('profile.email.store'), ['email' => 'new@example.com'])
            ->assertSessionHasNoErrors();

        $this->assertSame($original, $user->fresh()->email);
        Notification::assertSentOnDemand(VerifyEmailChange::class, function ($notification) {
            $this->post($notification->url)
                ->assertRedirect(route('profile.edit'))
                ->assertSessionHasNoErrors();

            return true;
        });
        $this->assertSame('new@example.com', $user->fresh()->email);
        $this->assertDatabaseCount('pending_email_changes', 0);
    }
}
