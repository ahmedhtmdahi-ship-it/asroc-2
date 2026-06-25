<?php

namespace App\Http\Controllers;

use App\Http\Resources\MedicineBatchResource;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MedicineBatchController extends Controller
{
    public function index(Request $request)
    {
        $query = MedicineBatch::with(['medicine', 'supplier']);

        if ($request->filled('medicine_id')) {
            $query->where('medicine_id', $request->medicine_id);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->boolean('expiring_soon')) {
            $query->where('expiry_date', '>', now())
                  ->where('expiry_date', '<=', now()->addDays(30))
                  ->where('quantity_remaining', '>', 0);
        }

        if ($request->boolean('expired')) {
            $query->where('expiry_date', '<', now())
                  ->where('quantity_remaining', '>', 0);
        }

        return MedicineBatchResource::collection($query->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'medicine_id'              => 'required|exists:medicines,id',
            'supplier_id'              => 'nullable|exists:suppliers,id',
            'batch_number'             => 'nullable|string|max:100',
            'expiry_date'              => 'required|date|after:today',
            'quantity_received'        => 'required|integer|min:1',
            'purchase_price_per_unit'  => 'required|numeric|min:0',
            'received_at'              => 'required|date',
            'notes'                    => 'nullable|string',
        ]);

        $medicine = Medicine::findOrFail($validated['medicine_id']);

        $oldStock   = (int) $medicine->current_stock;
        $oldAvgCost = (float) ($medicine->average_cost ?? 0);
        $quantity   = (int) $validated['quantity_received'];
        $price      = (float) $validated['purchase_price_per_unit'];

        $newTotalStock = $oldStock + $quantity;
        $newAvgCost    = $newTotalStock > 0
            ? (($oldStock * $oldAvgCost) + ($quantity * $price)) / $newTotalStock
            : $price;

        $batch = MedicineBatch::create(array_merge($validated, [
            'quantity_remaining' => $quantity,
            'received_by'        => Auth::id(),
        ]));

        $medicine->update([
            'current_stock' => $newTotalStock,
            'average_cost'  => round($newAvgCost, 2),
        ]);

        return (new MedicineBatchResource($batch->load(['medicine', 'supplier'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show($id)
    {
        $batch = MedicineBatch::with(['medicine', 'supplier', 'receivedBy'])->findOrFail($id);

        return new MedicineBatchResource($batch);
    }

    public function adjust(Request $request, $id)
    {
        $validated = $request->validate([
            'adjustment' => 'required|integer',
            'reason'     => 'required|string',
        ]);

        $batch = MedicineBatch::with('medicine')->findOrFail($id);

        $newQuantity = $batch->quantity_remaining + $validated['adjustment'];

        if ($newQuantity < 0) {
            return response()->json([
                'message' => 'الكمية المتبقية لا يمكن أن تكون أقل من صفر',
            ], 422);
        }

        $batch->update(['quantity_remaining' => $newQuantity]);

        $batch->medicine->increment('current_stock', $validated['adjustment']);

        return new MedicineBatchResource($batch->fresh(['medicine', 'supplier']));
    }

    public function expiringSoon()
    {
        $batches = MedicineBatch::with(['medicine', 'supplier'])
            ->where('expiry_date', '>', now())
            ->where('expiry_date', '<=', now()->addDays(30))
            ->where('quantity_remaining', '>', 0)
            ->orderBy('expiry_date')
            ->paginate(15);

        return MedicineBatchResource::collection($batches);
    }

    public function expired()
    {
        $batches = MedicineBatch::with(['medicine', 'supplier'])
            ->where('expiry_date', '<', now())
            ->where('quantity_remaining', '>', 0)
            ->orderBy('expiry_date')
            ->paginate(15);

        return MedicineBatchResource::collection($batches);
    }
}
