<?php

namespace App\Http\Controllers;

use App\Models\MedicineBatch;
use App\Models\PrescriptionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PharmacyCostReportController extends Controller
{
    public function monthly(Request $request)
    {
        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $month = $request->month; // e.g. "2026-06"
        [$year, $mon] = explode('-', $month);

        $startDate = "{$year}-{$mon}-01";
        $endDate   = date('Y-m-t', strtotime($startDate));

        // Base query: dispensed prescription items in the given month
        $baseQuery = PrescriptionItem::query()
            ->join('prescriptions', 'prescription_items.prescription_id', '=', 'prescriptions.id')
            ->whereNotNull('prescriptions.dispensed_at')
            ->where('prescription_items.unit_cost', '>', 0)
            ->whereBetween('prescriptions.dispensed_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        // Total cost
        $totalCost = (clone $baseQuery)->sum(
            DB::raw('prescription_items.unit_cost * prescription_items.quantity_dispensed')
        );

        // By category (medicine.category)
        $byCategory = (clone $baseQuery)
            ->join('medicines', 'prescription_items.medicine_id', '=', 'medicines.id')
            ->select(
                'medicines.category',
                DB::raw('SUM(prescription_items.unit_cost * prescription_items.quantity_dispensed) as total_cost'),
                DB::raw('SUM(prescription_items.quantity_dispensed) as items_dispensed')
            )
            ->groupBy('medicines.category')
            ->orderByDesc('total_cost')
            ->get()
            ->map(fn($row) => [
                'category'        => $row->category,
                'total_cost'      => (float) $row->total_cost,
                'items_dispensed' => (int) $row->items_dispensed,
            ]);

        // By department (via checkup_requests -> employees -> departments)
        $byDepartment = DB::table('prescription_items')
            ->join('prescriptions', 'prescription_items.prescription_id', '=', 'prescriptions.id')
            ->join('checkup_requests', 'prescriptions.checkup_request_id', '=', 'checkup_requests.id')
            ->join('employees', 'checkup_requests.employee_id', '=', 'employees.id')
            ->join('departments', 'employees.department_id', '=', 'departments.id')
            ->whereNotNull('prescriptions.dispensed_at')
            ->where('prescription_items.unit_cost', '>', 0)
            ->whereBetween('prescriptions.dispensed_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->select(
                'departments.name as department',
                DB::raw('SUM(prescription_items.unit_cost * prescription_items.quantity_dispensed) as total_cost'),
                DB::raw('COUNT(DISTINCT prescriptions.id) as prescriptions')
            )
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('total_cost')
            ->get()
            ->map(fn($row) => [
                'department'    => $row->department,
                'total_cost'    => (float) $row->total_cost,
                'prescriptions' => (int) $row->prescriptions,
            ]);

        // Top medicines
        $topMedicines = (clone $baseQuery)
            ->join('medicines', 'prescription_items.medicine_id', '=', 'medicines.id')
            ->select(
                'medicines.name as medicine_name',
                DB::raw('SUM(prescription_items.quantity_dispensed) as quantity'),
                DB::raw('SUM(prescription_items.unit_cost * prescription_items.quantity_dispensed) as total_cost')
            )
            ->groupBy('medicines.id', 'medicines.name')
            ->orderByDesc('total_cost')
            ->limit(10)
            ->get()
            ->map(fn($row) => [
                'medicine_name' => $row->medicine_name,
                'quantity'      => (int) $row->quantity,
                'total_cost'    => (float) $row->total_cost,
            ]);

        return response()->json([
            'month'         => $month,
            'total_cost'    => (float) $totalCost,
            'by_category'   => $byCategory,
            'by_department' => $byDepartment,
            'top_medicines' => $topMedicines,
        ]);
    }

    public function inventoryValue()
    {
        $batches = MedicineBatch::with('medicine')
            ->where('quantity_remaining', '>', 0)
            ->get();

        $totalValue = 0;
        $byMedicine = [];

        foreach ($batches as $batch) {
            $value       = (float) $batch->quantity_remaining * (float) $batch->purchase_price_per_unit;
            $totalValue += $value;

            $medicineId   = $batch->medicine_id;
            $medicineName = $batch->medicine?->name ?? 'Unknown';

            if (!isset($byMedicine[$medicineId])) {
                $byMedicine[$medicineId] = [
                    'medicine_id'   => $medicineId,
                    'medicine_name' => $medicineName,
                    'total_value'   => 0,
                    'total_units'   => 0,
                ];
            }

            $byMedicine[$medicineId]['total_value'] += $value;
            $byMedicine[$medicineId]['total_units'] += $batch->quantity_remaining;
        }

        $byMedicineList = array_values($byMedicine);
        usort($byMedicineList, fn($a, $b) => $b['total_value'] <=> $a['total_value']);

        // Round values
        foreach ($byMedicineList as &$item) {
            $item['total_value'] = round($item['total_value'], 2);
        }

        return response()->json([
            'total_value' => round($totalValue, 2),
            'by_medicine' => $byMedicineList,
        ]);
    }
}
