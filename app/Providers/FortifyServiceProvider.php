<?php

namespace App\Providers;

/* @chisel-registration */

use App\Actions\Fortify\CreateNewUser;
/* @end-chisel-registration */
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Controllers\Auth\PasswordConfirmationController;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Responses\PasswordResetLinkResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;
use Illuminate\Http\Request;
use Illuminate\Routing\RouteCollection;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\Http\Requests\LoginRequest as FortifyLoginRequest;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(FortifyLoginRequest::class, LoginRequest::class);
        $this->app->bind(SuccessfulPasswordResetLinkRequestResponse::class, PasswordResetLinkResponse::class);
        $this->app->bind(FailedPasswordResetLinkRequestResponse::class, PasswordResetLinkResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
        $this->configureSensitiveActionRoutes();
    }

    /**
     * Configure confirmation handling and remove its routes when the feature is disabled.
     */
    private function configureSensitiveActionRoutes(): void
    {
        if ($this->app->routesAreCached()) {
            return;
        }

        $this->app->booted(function (): void {
            $router = $this->app->make(Router::class);
            $routes = new RouteCollection;

            foreach ($router->getRoutes()->getRoutes() as $route) {

                if ($route->getName() === 'password.confirmation') {
                    $route->uses([PasswordConfirmationController::class, 'status']);
                }

                if ($route->getName() === 'password.confirm.store') {
                    $route->middleware('throttle:password-confirmation');
                    $route->uses([PasswordConfirmationController::class, 'store']);
                }

                if ($route->getName() === 'passkey.store') {
                    $route->middleware(HandlePrecognitiveRequests::class);
                }

                if (config('fortify.password_confirmation', true) || ! in_array($route->getName(), [
                    'password.confirm',
                    'password.confirm.store',
                    'password.confirmation',

                    'passkey.confirm-options',
                    'passkey.confirm',

                ], true)) {
                    $routes->add($route);
                }
            }

            $routes->refreshNameLookups();
            $routes->refreshActionLookups();
            $router->setRoutes($routes);
        });
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        /* @chisel-registration */
        Fortify::createUsersUsing(CreateNewUser::class);
        /* @end-chisel-registration */
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'failedAuthenticationMessage' => __('auth.failed'),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        /* @chisel-email-verification */
        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));
        /* @end-chisel-email-verification */

        /* @chisel-registration */
        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));
        /* @end-chisel-registration */

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn (Request $request) => Inertia::render('auth/confirm-password', [

            'canConfirmWithPasskey' => Features::canManagePasskeys()
                && ($request->user()?->passkeys()->exists() ?? false),

        ]));

    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('email-change', fn (Request $request) => $request->isPrecognitive()
            ? Limit::perMinute(30)->by('validation:'.$request->user()?->getAuthIdentifier())
            : Limit::perMinute(6)->by('submission:'.$request->user()?->getAuthIdentifier()));

        RateLimiter::for('password-confirmation', fn (Request $request) => [
            Limit::perMinute(5)->by('user:'.$request->user()?->getAuthIdentifier()),
            Limit::perMinute(30)->by('ip:'.$request->ip()),
        ]);

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $username = $request->input(Fortify::username());
            $throttleKey = Str::transliterate(Str::lower(is_string($username) ? $username : '').'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {
            if ($request->isPrecognitive()) {
                return Limit::perMinute(30)->by('validation:'.$request->user()?->getAuthIdentifier());
            }

            $credential = $request->input('credential.id');
            $key = is_string($credential) && $credential !== '' ? $credential : $request->session()->getId();

            return Limit::perMinute(10)->by($key.'|'.$request->ip());
        });

    }
}
