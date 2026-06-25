<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Controller;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     * Authenticate a user by financial_number (or email) + password.
     */
    public function login(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',  // financial_number or email
            'password'   => 'required|string',
        ]);

        $identifier = $request->identifier;

        // Try to find employee by financial_number first
        $employee = \App\Models\Employee::where('financial_number', $identifier)->with('user')->first();

        if ($employee) {
            $user = $employee->user;
        } else {
            // Fallback: try exact email, then generated asorc.local email (case-insensitive)
            $user = \App\Models\User::whereRaw('LOWER(email) = ?', [strtolower($identifier)])->first()
                 ?? \App\Models\User::whereRaw('LOWER(email) = ?', [strtolower($identifier) . '@asorc.local'])->first();
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'بيانات الدخول غير صحيحة'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'الحساب غير مفعّل'], 403);
        }

        $user->update(['last_login_at' => now()]);
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message'    => 'تم تسجيل الدخول بنجاح',
            'token'      => $token,
            'token_type' => 'Bearer',
            'user'       => [
                'id'               => $user->id,
                'name'             => $user->name,
                'email'            => $user->email,
                'financial_number' => $user->employee?->financial_number,
                'department'       => $user->employee?->department?->name,
                'job_title'        => $user->employee?->job_title,
                'roles'            => $user->getRoleNames(),
                'permissions'      => $user->getAllPermissions()->pluck('name'),
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     * Revoke the current access token.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'تم تسجيل الخروج بنجاح']);
    }

    /**
     * GET /api/auth/me
     * Return the authenticated user with roles and permissions.
     */
    public function me(Request $request)
    {
        $user = $request->user()->load(['employee.department']);

        return response()->json([
            'id'               => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'financial_number' => $user->employee?->financial_number,
            'department'       => $user->employee?->department?->name,
            'job_title'        => $user->employee?->job_title,
            'is_active'        => $user->is_active,
            'last_login_at'    => $user->last_login_at,
            'roles'            => $user->getRoleNames(),
            'permissions'      => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * PUT /api/auth/fcm-token
     * Update the authenticated user's FCM push-notification token.
     */
    public function updateFcmToken(Request $request)
    {
        $request->validate([
            'fcm_token' => 'required|string',
        ]);

        $request->user()->update(['fcm_token' => $request->fcm_token]);

        return response()->json(['message' => 'تم تحديث رمز الإشعارات بنجاح']);
    }
}
