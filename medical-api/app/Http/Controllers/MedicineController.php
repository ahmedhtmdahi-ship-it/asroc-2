<?php

namespace App\Http\Controllers;

use App\Http\Resources\MedicineResource;
use App\Imports\MedicinesImport;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class MedicineController extends Controller
{
    public function index(Request $request)
    {
        $query = Medicine::query();

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'LIKE', '%' . $request->search . '%');
        }

        $medicines = $query->paginate(15);

        return MedicineResource::collection($medicines);
    }

    public function show($id)
    {
        $medicine = Medicine::findOrFail($id);

        return new MedicineResource($medicine);
    }

    public function lowStock()
    {
        $medicines = Medicine::whereColumn('current_stock', '<=', 'minimum_stock')->get();

        return MedicineResource::collection($medicines);
    }

    public function alternatives($id)
    {
        $medicine = Medicine::findOrFail($id);

        $alternatives = Medicine::where('active_ingredient', $medicine->active_ingredient)
            ->where('id', '!=', $medicine->id)
            ->get();

        return MedicineResource::collection($alternatives);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'mimes:xlsx,xls', 'max:5120'],
        ]);

        Excel::import(new MedicinesImport, $request->file('file'));

        return response()->json(['message' => 'تم استيراد الأدوية بنجاح']);
    }
}
