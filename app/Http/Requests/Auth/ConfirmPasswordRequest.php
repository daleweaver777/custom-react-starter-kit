<?php

namespace App\Http\Requests\Auth;

use App\Concerns\PasswordValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmPasswordRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return ['password' => $this->currentPasswordRules()];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['password.current_password' => __('The provided password was incorrect.')];
    }
}
