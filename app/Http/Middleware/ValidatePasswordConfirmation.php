<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidatePasswordConfirmation
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->validate(['password' => ['required', 'string']]);

        return $next($request);
    }
}
