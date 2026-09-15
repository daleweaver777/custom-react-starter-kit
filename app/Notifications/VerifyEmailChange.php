<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailChange extends Notification
{
    public function __construct(public string $url) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Verify your new email address'))
            ->line(__('Verify this address to use it for sign-in and password recovery. Your existing address remains active until you confirm the change.'))
            ->action(__('Verify email address'), $this->url)
            ->line(__('Sign in to the account that requested this change. This verification link expires in 30 minutes and can only be used once.'))
            ->line(__('If you did not request this change, no action is required.'));
    }
}
