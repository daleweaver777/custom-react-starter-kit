<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ConfirmPasswordRequest;
use Laravel\Fortify\Contracts\PasswordConfirmedResponse;

class PasswordConfirmationController extends Controller
{
    public function store(ConfirmPasswordRequest $request): PasswordConfirmedResponse
    {
        $request->session()->passwordConfirmed();

        return app(PasswordConfirmedResponse::class);
    }
}
