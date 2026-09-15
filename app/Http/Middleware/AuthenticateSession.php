<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession as BaseAuthenticateSession;

class AuthenticateSession extends BaseAuthenticateSession
{
    /**
     * Store the password fingerprint on the successful login response.
     *
     * Laravel normally stores it on the next authenticated request. Saving
     * it here ensures a password change can revoke this session even if
     * the browser has not yet followed the login redirect.
     *
     * @param  Request  $request
     */
    public function handle($request, Closure $next)
    {
        if ($request->hasSession() && ! $request->user()) {
            return tap($next($request), function () use ($request): void {
                $this->storePasswordHashInSession($request);
            });
        }

        return parent::handle($request, $next);
    }
}
