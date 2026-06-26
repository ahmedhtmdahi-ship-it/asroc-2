<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployeeAdminController extends Controller
{
    /**
     * GET /api/admin/employees
     * Paginate all employees with user and department.
     * Filters: type (active|retired), department_id, search
     */
    public function index(Request $request)
    {
        $query = Employee::with(['user', 'department']);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('financial_number', 'like', "%{$term}%")
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$term}%"));
            });
        }

        $employees = $query->paginate($request->get('per_page', 15));

        return EmployeeResource::collection($employees);
    }

    /**
     * GET /api/admin/employees/{id}/family-members
     * Return all family members of a specific employee (admin access).
     */
    public function familyMembers($id)
    {
        $employee = Employee::with('familyMembers')->findOrFail($id);

        return response()->json([
            'data' => $employee->familyMembers->map(fn ($fm) => [
                'id'          => $fm->id,
                'name'        => $fm->name,
                'national_id' => $fm->national_id,
                'relation'    => $fm->relation,
                'birth_date'  => $fm->birth_date?->format('Y-m-d'),
                'is_active'   => $fm->is_active,
            ]),
        ]);
    }

    /**
     * POST /api/admin/employees
     * Create a user and linked employee record in one transaction.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'email'            => 'required|email|unique:users,email',
            'password'         => 'required|string|min:8',
            'role'             => 'required|string|in:employee,retired_employee,manager,office_manager,security,doctor,internal_pharmacy,external_pharmacy,medical_admin,system_admin,top_management',
            'financial_number' => 'required|string|unique:employees,financial_number',
            'national_id'      => 'required|string|size:14|unique:employees,national_id',
            'department_id'    => 'required|exists:departments,id',
            'job_title'        => 'required|string|max:255',
            'type'             => 'required|string|in:active,retired',
            'phone'            => 'nullable|string|max:20',
        ]);

        $employee = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'     => $validated['name'],
                'email'    => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);

            $user->assignRole($validated['role']);

            $employee = Employee::create([
                'user_id'          => $user->id,
                'financial_number' => $validated['financial_number'],
                'national_id'      => $validated['national_id'],
                'department_id'    => $validated['department_id'],
                'job_title'        => $validated['job_title'],
                'type'             => $validated['type'],
                'phone'            => $validated['phone'] ?? null,
            ]);

            return $employee;
        });

        $employee->load(['user', 'department']);

        return (new EmployeeResource($employee))->response()->setStatusCode(201);
    }

    /**
     * GET /api/admin/employees/{id}
     * Return a single employee with user, department, and family members.
     */
    public function show($id)
    {
        $employee = Employee::with(['user', 'department', 'familyMembers'])->findOrFail($id);

        return new EmployeeResource($employee);
    }

    /**
     * PUT /api/admin/employees/{id}
     * Update employee fields (not user credentials).
     */
    public function update(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);

        $validated = $request->validate([
            'financial_number' => 'sometimes|required|string|unique:employees,financial_number,' . $employee->id,
            'national_id'      => 'sometimes|required|string|size:14|unique:employees,national_id,' . $employee->id,
            'department_id'    => 'sometimes|required|exists:departments,id',
            'job_title'        => 'sometimes|required|string|max:255',
            'type'             => 'sometimes|required|string|in:active,retired',
            'phone'            => 'sometimes|nullable|string|max:20',
        ]);

        $employee->update($validated);

        $employee->load(['user', 'department']);

        return new EmployeeResource($employee);
    }

    /**
     * DELETE /api/admin/employees/{id}
     * Delete an employee and their user account.
     */
    public function destroy($id)
    {
        $employee = Employee::with('user')->findOrFail($id);

        DB::transaction(function () use ($employee) {
            $user = $employee->user;
            $employee->delete();
            if ($user) {
                $user->delete();
            }
        });

        return response()->json(['message' => 'تم حذف الموظف بنجاح']);
    }
}
