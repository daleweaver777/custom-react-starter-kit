<?php

namespace App\Concerns;

use Illuminate\Support\Facades\Config;
use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    /**
     * Get the validation rules for choosing a new password.
     *
     * @return array<int, Password|string>
     */
    protected function newPasswordRules(): array
    {
        return [...$this->passwordInputRules(), Password::default()];
    }

    /**
     * Get the validation rules for matching two password fields.
     *
     * @return array<int, string>
     */
    protected function matchingPasswordRules(string $passwordField = 'password'): array
    {
        return [...$this->passwordInputRules(), 'same:'.$passwordField];
    }

    /**
     * Get the validation rules used to validate the current password.
     *
     * @return array<int, string>
     */
    protected function currentPasswordRules(): array
    {
        return [...$this->passwordInputRules(), 'current_password'];
    }

    /**
     * Bound password input before hashing or verification.
     *
     * @return array<int, string>
     */
    protected function passwordInputRules(): array
    {
        return ['bail', 'required', 'string', 'max:'.Config::integer('auth.password_max_length')];
    }
}
