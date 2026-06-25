<?php

namespace App\Http\Controllers;

use App\Enums\FamilyRelation;
use App\Http\Resources\FamilyMemberResource;
use App\Models\FamilyMember;
use Illuminate\Http\Request;

class FamilyMemberController extends Controller
{
    /**
     * GET /api/family-members
     * Return the authenticated user's family members.
     * Only accessible by retired_employee role.
     */
    public function index(Request $request)
    {
        $employee = $request->user()->employee()->firstOrFail();

        $familyMembers = $employee->familyMembers()->get();

        return FamilyMemberResource::collection($familyMembers);
    }

    /**
     * POST /api/family-members
     * Add a new family member for the authenticated employee.
     */
    public function store(Request $request)
    {
        $relationValues = array_column(FamilyRelation::cases(), 'value');

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'national_id' => 'required|string|size:14|unique:family_members,national_id',
            'relation'    => 'required|string|in:' . implode(',', $relationValues),
            'birth_date'  => 'required|date',
        ]);

        $employee = $request->user()->employee()->firstOrFail();

        $familyMember = $employee->familyMembers()->create($validated);

        return (new FamilyMemberResource($familyMember))->response()->setStatusCode(201);
    }

    /**
     * GET /api/family-members/{id}
     * Show a single family member (must belong to authenticated user).
     */
    public function show(Request $request, $id)
    {
        $employee     = $request->user()->employee()->firstOrFail();
        $familyMember = $employee->familyMembers()->findOrFail($id);

        return new FamilyMemberResource($familyMember);
    }

    /**
     * PUT /api/family-members/{id}
     * Update a family member (must belong to authenticated user).
     */
    public function update(Request $request, $id)
    {
        $employee     = $request->user()->employee()->firstOrFail();
        $familyMember = $employee->familyMembers()->findOrFail($id);

        $relationValues = array_column(FamilyRelation::cases(), 'value');

        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'national_id' => 'sometimes|required|string|size:14|unique:family_members,national_id,' . $familyMember->id,
            'relation'    => 'sometimes|required|string|in:' . implode(',', $relationValues),
            'birth_date'  => 'sometimes|required|date',
        ]);

        $familyMember->update($validated);

        return new FamilyMemberResource($familyMember);
    }

    /**
     * DELETE /api/family-members/{id}
     * Delete a family member (must belong to authenticated user).
     */
    public function destroy(Request $request, $id)
    {
        $employee     = $request->user()->employee()->firstOrFail();
        $familyMember = $employee->familyMembers()->findOrFail($id);

        $familyMember->delete();

        return response()->json(['message' => 'تم حذف فرد الأسرة بنجاح']);
    }
}
