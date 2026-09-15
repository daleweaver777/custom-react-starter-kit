<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_model_creation_and_updates_store_lowercase_email(): void
    {
        $user = User::factory()->create(['email' => 'First+Tag@Example.COM']);
        $this->assertSame('first+tag@example.com', $user->fresh()->email);

        $user->update(['email' => 'Second.Name@Example.COM']);
        $this->assertSame('second.name@example.com', $user->fresh()->email);

        $user->forceFill(['email' => 'Third@Example.COM'])->save();
        $this->assertSame('third@example.com', $user->fresh()->email);
    }

    public function test_unique_index_rejects_case_variant_model_creation(): void
    {
        User::factory()->create(['email' => 'Test@Example.COM']);

        $this->expectException(UniqueConstraintViolationException::class);
        User::factory()->create(['email' => 'TEST@EXAMPLE.COM']);
    }

    public function test_unique_index_rejects_case_variant_model_updates(): void
    {
        User::factory()->create(['email' => 'Test@Example.COM']);
        $other = User::factory()->create(['email' => 'other@example.com']);

        $this->expectException(UniqueConstraintViolationException::class);
        $other->update(['email' => 'TEST@EXAMPLE.COM']);
    }
}
