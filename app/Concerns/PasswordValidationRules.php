<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    /**
     * Get the validation rules used to validate passwords.
     *
     * @return array<int, Password|ValidationRule|array<mixed>|string>
     */
    protected function passwordRules(): array
    {
        return [...$this->passwordInputRules(), Password::default()];
    }

    /**
     * Get the validation rules used to validate password confirmation.
     *
     * @return array<int, string>
     */
    protected function passwordConfirmationRules(string $passwordField = 'password'): array
    {
        return [...$this->passwordInputRules(), 'same:'.$passwordField];
    }

    /**
     * Get the validation rules used to validate the current password.
     *
     * @return array<int, Password|ValidationRule|array<mixed>|string>
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
        return ['bail', 'required', 'string', 'max:255'];
    }
}
