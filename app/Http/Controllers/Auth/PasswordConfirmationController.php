<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ConfirmPasswordRequest;
/* @chisel-passkeys */
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
/* @end-chisel-passkeys */
use Laravel\Fortify\Contracts\PasswordConfirmedResponse;
/* @chisel-passkeys */
use Laravel\Fortify\Features;
use Laravel\Fortify\Http\Controllers\ConfirmedPasswordStatusController;

/* @end-chisel-passkeys */

class PasswordConfirmationController extends Controller
{
    /* @chisel-passkeys */
    public function status(Request $request): JsonResponse
    {
        $response = app(ConfirmedPasswordStatusController::class)->show($request);
        /** @var array{confirmed: bool} $status */
        $status = $response->getData(true);
        $canConfirmWithPasskey = ! $status['confirmed']
            && Features::canManagePasskeys()
            && ($request->user()?->passkeys()->exists() ?? false);

        return $response->setData([
            ...$status,
            'canConfirmWithPasskey' => $canConfirmWithPasskey,
        ]);
    }

    /* @end-chisel-passkeys */

    public function store(ConfirmPasswordRequest $request): PasswordConfirmedResponse
    {
        $request->session()->passwordConfirmed();

        return app(PasswordConfirmedResponse::class);
    }
}
