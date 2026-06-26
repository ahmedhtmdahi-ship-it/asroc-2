<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id', 'user_name', 'action', 'request_id',
        'status_before', 'status_after', 'meta',
    ];

    protected $casts = ['meta' => 'array'];

    public static function record(
        string $action,
        ?string $requestId = null,
        ?string $statusBefore = null,
        ?string $statusAfter = null,
        array $meta = [],
    ): void {
        $user = Auth::user();

        static::create([
            'user_id'       => $user?->id,
            'user_name'     => $user?->name,
            'action'        => $action,
            'request_id'    => $requestId,
            'status_before' => $statusBefore,
            'status_after'  => $statusAfter,
            'meta'          => $meta ?: null,
        ]);
    }
}
