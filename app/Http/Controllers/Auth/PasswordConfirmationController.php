<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ConfirmPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\PasswordConfirmedResponse;
use Laravel\Fortify\Features;
use Laravel\Fortify\Http\Controllers\ConfirmedPasswordStatusController;

class PasswordConfirmationController extends Controller
{
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

    public function store(ConfirmPasswordRequest $request): PasswordConfirmedResponse
    {
        $request->session()->passwordConfirmed();

        return app(PasswordConfirmedResponse::class);
    }
}
