<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user')->latest();

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('request_id')) {
            $query->where('request_id', $request->request_id);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $logs = $query->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => $logs->map(fn ($log) => [
                'id'             => $log->id,
                'user_id'        => $log->user_id,
                'user_name'      => $log->user_name,
                'action'         => $log->action,
                'request_id'     => $log->request_id,
                'status_before'  => $log->status_before,
                'status_after'   => $log->status_after,
                'meta'           => $log->meta,
                'created_at'     => $log->created_at?->toISOString(),
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
            ],
        ]);
    }
}
