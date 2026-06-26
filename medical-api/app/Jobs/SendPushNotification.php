<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        public string $fcmToken,
        public string $title,
        public string $body,
        public array $data = []
    ) {}

    public function handle(): void
    {
        $credentialsPath = config('firebase.credentials');

        if (! $credentialsPath || ! file_exists($credentialsPath)) {
            Log::warning('FCM: credentials file not found — skipping push notification. Set FIREBASE_CREDENTIALS in .env');
            return;
        }

        try {
            $credentials = json_decode(file_get_contents($credentialsPath), true);
            $projectId   = $credentials['project_id'];
            $accessToken = $this->getAccessToken($credentials);

            $response = Http::withToken($accessToken)
                ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                    'message' => [
                        'token'        => $this->fcmToken,
                        'notification' => [
                            'title' => $this->title,
                            'body'  => $this->body,
                        ],
                        'data'    => array_map('strval', $this->data),
                        'android' => ['priority' => 'high'],
                        'apns'    => [
                            'payload' => ['aps' => ['sound' => 'default', 'badge' => 1]],
                        ],
                    ],
                ]);

            if (! $response->successful()) {
                Log::error('FCM send failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                    'token'  => substr($this->fcmToken, 0, 20) . '...',
                ]);
                $this->fail($response->body());
            }
        } catch (\Throwable $e) {
            Log::error('FCM error: ' . $e->getMessage());
            $this->fail($e);
        }
    }

    /**
     * Exchange a Firebase service-account JSON for a short-lived OAuth2 access token.
     * Uses only PHP's built-in openssl — no extra packages required.
     */
    private function getAccessToken(array $credentials): string
    {
        $now     = time();
        $header  = $this->b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $payload = $this->b64url(json_encode([
            'iss'   => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud'   => 'https://oauth2.googleapis.com/token',
            'iat'   => $now,
            'exp'   => $now + 3600,
        ]));

        $signingInput = "{$header}.{$payload}";
        $privateKey   = openssl_pkey_get_private($credentials['private_key']);
        openssl_sign($signingInput, $signature, $privateKey, 'SHA256');
        $jwt = "{$signingInput}." . $this->b64url($signature);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Failed to get FCM access token: ' . $response->body());
        }

        return $response->json('access_token');
    }

    private function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
