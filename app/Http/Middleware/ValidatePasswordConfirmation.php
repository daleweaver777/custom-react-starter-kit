<?php

namespace App\Http\Middleware;

use App\Concerns\PasswordValidationRules;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidatePasswordConfirmation
{
    use PasswordValidationRules;

    public function handle(Request $request, Closure $next): Response
    {
        $request->validate(['password' => $this->passwordInputRules()]);

        return $next($request);
    }
}
