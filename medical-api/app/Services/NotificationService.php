<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\User;
use App\Jobs\SendPushNotification;

class NotificationService
{
    public function send(User $user, string $title, string $body, string $type, array $data = []): AppNotification
    {
        $notification = AppNotification::create([
            'user_id' => $user->id,
            'title'   => $title,
            'body'    => $body,
            'type'    => $type,
            'data'    => $data,
        ]);

        // Dispatch push notification job if user has FCM token
        if ($user->fcm_token) {
            SendPushNotification::dispatch($user->fcm_token, $title, $body, $data);
        }

        return $notification;
    }

    public function sendToRole(string $role, string $title, string $body, string $type, array $data = []): void
    {
        $users = User::role($role)->where('is_active', true)->get();
        foreach ($users as $user) {
            $this->send($user, $title, $body, $type, $data);
        }
    }
}
