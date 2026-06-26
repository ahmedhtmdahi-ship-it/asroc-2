<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    /**
     * GET /api/admin/departments
     * Return all departments with their manager.
     */
    public function index()
    {
        $departments = Department::with('manager')->get();

        return DepartmentResource::collection($departments);
    }

    /**
     * POST /api/admin/departments
     * Create a new department.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255|unique:departments,name',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        $department = Department::create($validated);

        $department->load('manager');

        return (new DepartmentResource($department))->response()->setStatusCode(201);
    }

    /**
     * GET /api/admin/departments/{id}
     * Return a single department with its manager.
     */
    public function show($id)
    {
        $department = Department::with('manager')->findOrFail($id);

        return new DepartmentResource($department);
    }

    /**
     * PUT /api/admin/departments/{id}
     * Update a department.
     */
    public function update(Request $request, $id)
    {
        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'name'       => 'sometimes|required|string|max:255|unique:departments,name,' . $department->id,
            'manager_id' => 'sometimes|nullable|exists:users,id',
        ]);

        $department->update($validated);

        $department->load('manager');

        return new DepartmentResource($department);
    }

    /**
     * DELETE /api/admin/departments/{id}
     * Delete a department. Fails if employees are assigned.
     */
    public function destroy($id)
    {
        $department = Department::withCount('employees')->findOrFail($id);

        if ($department->employees_count > 0) {
            return response()->json(['message' => 'لا يمكن حذف إدارة بها موظفون'], 422);
        }

        $department->delete();

        return response()->json(['message' => 'تم حذف الإدارة بنجاح']);
    }
}
