<?php

namespace App\Http\Requests\Auth;

use App\Concerns\PasswordValidationRules;
use Laravel\Fortify\Http\Requests\LoginRequest as FortifyLoginRequest;

class LoginRequest extends FortifyLoginRequest
{
    use PasswordValidationRules;

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'password' => $this->passwordInputRules(),
        ];
    }
}
