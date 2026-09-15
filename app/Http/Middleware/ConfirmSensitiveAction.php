<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\RequirePassword;

class ConfirmSensitiveAction extends RequirePassword
{
    public function handle($request, Closure $next, $redirectToRoute = null, $passwordTimeoutSeconds = null)
    {
        // Only routes with HandlePrecognitiveRequests can enter this read-only path.
        if ($request->isPrecognitive() || ! config('fortify.password_confirmation', true)) {
            return $next($request);
        }

        return parent::handle($request, $next, $redirectToRoute, $passwordTimeoutSeconds ?? config('auth.password_timeout', 300));
    }
}
