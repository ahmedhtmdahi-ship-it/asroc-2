<?php

namespace App\Http\Controllers;

use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query();

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return SupplierResource::collection($query->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'phone'        => 'required|string|max:50',
            'contact_name' => 'nullable|string|max:255',
            'email'        => 'nullable|email|max:255',
            'address'      => 'nullable|string',
            'notes'        => 'nullable|string',
        ]);

        $supplier = Supplier::create($validated + ['is_active' => true]);

        return (new SupplierResource($supplier))
            ->response()
            ->setStatusCode(201);
    }

    public function show($id)
    {
        $supplier = Supplier::withCount('batches')->findOrFail($id);

        $totalReceived = $supplier->batches()->sum('quantity_received');

        return (new SupplierResource($supplier))->additional([
            'meta' => [
                'total_batches'            => $supplier->batches_count,
                'total_medicines_received' => (int) $totalReceived,
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name'         => 'sometimes|required|string|max:255',
            'phone'        => 'sometimes|required|string|max:50',
            'contact_name' => 'nullable|string|max:255',
            'email'        => 'nullable|email|max:255',
            'address'      => 'nullable|string',
            'is_active'    => 'sometimes|boolean',
            'notes'        => 'nullable|string',
        ]);

        $supplier->update($validated);

        return new SupplierResource($supplier);
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);

        if ($supplier->batches()->exists()) {
            return response()->json([
                'message' => 'لا يمكن حذف مورد له دفعات في النظام',
            ], 422);
        }

        $supplier->delete();

        return response()->json(['message' => 'تم حذف المورد بنجاح']);
    }

    public function toggleStatus($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->update(['is_active' => !$supplier->is_active]);

        return response()->json([
            'message'   => $supplier->is_active ? 'تم تفعيل المورد' : 'تم تعطيل المورد',
            'is_active' => $supplier->is_active,
        ]);
    }
}
