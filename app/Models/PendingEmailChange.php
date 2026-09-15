<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $user_id
 * @property string $original_email
 * @property string $email
 * @property string $token_hash
 * @property string $password_fingerprint
 * @property Carbon $expires_at
 */
#[Fillable(['user_id'])]
#[Hidden(['token_hash', 'password_fingerprint'])]
class PendingEmailChange extends Model
{
    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }
}
