<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],

            'passwordConfirmation' => [
                'enabled' => (bool) config('fortify.password_confirmation', true),
                'timeout' => (int) config('auth.password_timeout', 300),
                'confirmedUntil' => config('fortify.password_confirmation', true) && $request->session()->has('auth.password_confirmed_at')
                    ? ((int) $request->session()->get('auth.password_confirmed_at') + (int) config('auth.password_timeout', 300)) * 1000
                    : 0,
                'statusUrl' => config('fortify.password_confirmation', true) ? route('password.confirmation', [], false) : null,
                'submitUrl' => config('fortify.password_confirmation', true) ? route('password.confirm.store', [], false) : null,
            ],

            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
