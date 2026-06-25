<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * GET /api/admin/users
     * Paginate all users with their roles.
     */
    public function index()
    {
        $users = User::with('roles')->paginate(15);

        return UserResource::collection($users);
    }

    /**
     * POST /api/admin/users
     * Create a new user and assign a role.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role'     => 'required|string|in:employee,retired_employee,manager,office_manager,security,doctor,internal_pharmacy,external_pharmacy,medical_admin,system_admin,top_management',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        $user->load('roles');

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * GET /api/admin/users/{id}
     * Return a single user with their roles.
     */
    public function show($id)
    {
        $user = User::with('roles')->findOrFail($id);

        return new UserResource($user);
    }

    /**
     * PUT /api/admin/users/{id}
     * Update user details. Password is optional.
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'     => 'sometimes|required|string|max:255',
            'email'    => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:8',
            'role'     => 'sometimes|required|string|in:employee,retired_employee,manager,office_manager,security,doctor,internal_pharmacy,external_pharmacy,medical_admin,system_admin,top_management',
        ]);

        $updateData = array_filter([
            'name'  => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
        ], fn($v) => $v !== null);

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        $user->load('roles');

        return new UserResource($user);
    }

    /**
     * DELETE /api/admin/users/{id}
     * Delete a user (cannot delete self).
     */
    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'لا يمكنك حذف حسابك الخاص'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'تم حذف المستخدم بنجاح']);
    }

    /**
     * POST /api/admin/users/{id}/toggle-status
     * Flip the is_active boolean for a user.
     */
    public function toggleStatus($id)
    {
        $user = User::findOrFail($id);

        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message'   => 'تم تغيير حالة المستخدم',
            'is_active' => $user->is_active,
        ]);
    }
}
