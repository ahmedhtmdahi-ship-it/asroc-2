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
     */
    public function index()
    {
        $employees = Employee::with(['user', 'department'])->paginate(15);

        return EmployeeResource::collection($employees);
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
