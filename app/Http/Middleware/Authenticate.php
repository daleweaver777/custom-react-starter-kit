<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as BaseAuthenticate;
use Illuminate\Session\Middleware\AuthenticateSession;

class Authenticate extends BaseAuthenticate
{
    public function handle($request, Closure $next, ...$guards)
    {
        // Validate the session after Laravel authenticates and selects the requested guard.
        return parent::handle(
            $request,
            fn ($request) => app(AuthenticateSession::class)->handle($request, $next),
            ...$guards,
        );
    }
}
