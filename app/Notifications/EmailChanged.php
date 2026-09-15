<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailChanged extends Notification
{
    public function __construct(public string $email) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your account email address changed'))
            ->line(__('Your sign-in and recovery email address was changed to :email.', ['email' => $this->email]))
            ->line(__('If you did not make this change, contact the application administrator immediately.'));
    }
}
