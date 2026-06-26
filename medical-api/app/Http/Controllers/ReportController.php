<?php

namespace App\Http\Controllers;

use App\Enums\CheckupStatus;
use App\Enums\CheckupType;
use App\Enums\MonthlyTreatmentStatus;
use App\Enums\ReferralStatus;
use App\Models\CheckupRequest;
use App\Models\ExternalReferral;
use App\Models\Medicine;
use App\Models\MonthlyDispensingRecord;
use App\Models\MonthlyTreatment;
use App\Models\Prescription;
use App\Models\SickLeave;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Resolve date_from / date_to from request, defaulting to the current month.
     */
    private function resolveDateRange(Request $request): array
    {
        $dateFrom = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : Carbon::now()->startOfMonth();

        $dateTo = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : Carbon::now()->endOfMonth();

        return [$dateFrom, $dateTo];
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    public function dashboard()
    {
        $today = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();
        $monthEnd   = Carbon::now()->endOfMonth();

        // Today stats
        $todayRequests = CheckupRequest::whereDate('created_at', $today);

        $todayNew      = (clone $todayRequests)->count();
        $todayApproved = (clone $todayRequests)->where('status', CheckupStatus::Approved->value)->count();
        $todayRejected = (clone $todayRequests)->where('status', CheckupStatus::Rejected->value)->count();
        $outsideNow    = CheckupRequest::where('status', CheckupStatus::CheckedOut->value)->count();

        // This month stats
        $monthRequests = CheckupRequest::whereBetween('created_at', [$monthStart, $monthEnd]);

        $totalMonth    = (clone $monthRequests)->count();
        $normalMonth   = (clone $monthRequests)->where('type', CheckupType::Normal->value)->count();
        $emergencyMonth = (clone $monthRequests)->where('type', CheckupType::Emergency->value)->count();
        $completedMonth = (clone $monthRequests)->where('status', CheckupStatus::Completed->value)->count();

        $pendingStatuses = [
            CheckupStatus::Pending->value,
            CheckupStatus::Approved->value,
            CheckupStatus::CheckedOut->value,
            CheckupStatus::InDiagnosis->value,
            CheckupStatus::Prescribed->value,
        ];
        $pendingMonth = (clone $monthRequests)->whereIn('status', $pendingStatuses)->count();
        $rejectedMonth = (clone $monthRequests)->where('status', CheckupStatus::Rejected->value)->count();

        // Pharmacy
        $prescriptionsDispensed = Prescription::whereBetween('dispensed_at', [$monthStart, $monthEnd])
            ->whereNotNull('dispensed_at')
            ->count();

        $lowStockMedicines = Medicine::whereColumn('current_stock', '<=', 'minimum_stock')->count();

        // Referrals
        $referralsPendingApproval = ExternalReferral::where('status', ReferralStatus::PendingApproval->value)->count();

        $referralsApprovedMonth = ExternalReferral::whereBetween('reviewed_at', [$monthStart, $monthEnd])
            ->where('status', ReferralStatus::Approved->value)
            ->count();

        $referralsRejectedMonth = ExternalReferral::whereBetween('reviewed_at', [$monthStart, $monthEnd])
            ->where('status', ReferralStatus::Rejected->value)
            ->count();

        return response()->json([
            'today' => [
                'new_requests' => $todayNew,
                'approved'     => $todayApproved,
                'rejected'     => $todayRejected,
                'outside_now'  => $outsideNow,
            ],
            'this_month' => [
                'total_requests' => $totalMonth,
                'normal'         => $normalMonth,
                'emergency'      => $emergencyMonth,
                'completed'      => $completedMonth,
                'pending'        => $pendingMonth,
                'rejected'       => $rejectedMonth,
            ],
            'pharmacy' => [
                'prescriptions_dispensed' => $prescriptionsDispensed,
                'low_stock_medicines'     => $lowStockMedicines,
            ],
            'referrals' => [
                'pending_approval'      => $referralsPendingApproval,
                'approved_this_month'   => $referralsApprovedMonth,
                'rejected_this_month'   => $referralsRejectedMonth,
            ],
        ]);
    }

    // ── Daily Report ──────────────────────────────────────────────────────────

    public function daily(Request $request)
    {
        $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $date = $request->filled('date') ? Carbon::parse($request->date) : Carbon::today();

        $requests = CheckupRequest::with(['employee.user', 'employee.department', 'department'])
            ->whereDate('created_at', $date)
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'date'     => $date->toDateString(),
            'total'    => $requests->count(),
            'requests' => $requests->map(function ($req) {
                return [
                    'id'         => $req->id,
                    'employee'   => [
                        'id'   => $req->employee?->id,
                        'name' => $req->employee?->user?->name,
                    ],
                    'department' => $req->department?->name,
                    'type'       => $req->type?->value,
                    'status'     => $req->status?->value,
                    'notes'      => $req->notes,
                    'created_at' => $req->created_at,
                ];
            }),
        ]);
    }

    // ── Monthly Report ────────────────────────────────────────────────────────

    public function monthly(Request $request)
    {
        $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $monthStr  = $request->filled('month') ? $request->month : Carbon::now()->format('Y-m');
        $monthDate = Carbon::createFromFormat('Y-m', $monthStr);
        $start     = $monthDate->copy()->startOfMonth();
        $end       = $monthDate->copy()->endOfMonth();

        $requests = CheckupRequest::with(['employee.user', 'department'])
            ->whereBetween('created_at', [$start, $end])
            ->get();

        // By status
        $byStatus = $requests->groupBy(fn($r) => $r->status?->value)
            ->map->count();

        // By department
        $byDepartment = $requests->groupBy(fn($r) => $r->department?->name ?? 'Unknown')
            ->map->count();

        // By type
        $byType = $requests->groupBy(fn($r) => $r->type?->value)
            ->map->count();

        return response()->json([
            'month'         => $monthStr,
            'total'         => $requests->count(),
            'by_status'     => $byStatus,
            'by_department' => $byDepartment,
            'by_type'       => $byType,
        ]);
    }

    // ── Emergency Report ──────────────────────────────────────────────────────

    public function emergency(Request $request)
    {
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);

        $requests = CheckupRequest::with(['employee.user', 'department'])
            ->where('type', CheckupType::Emergency->value)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'date_from' => $dateFrom->toDateString(),
            'date_to'   => $dateTo->toDateString(),
            'total'     => $requests->count(),
            'requests'  => $requests->map(function ($req) {
                return [
                    'id'         => $req->id,
                    'employee'   => [
                        'id'   => $req->employee?->id,
                        'name' => $req->employee?->user?->name,
                    ],
                    'department' => $req->department?->name,
                    'status'     => $req->status?->value,
                    'notes'      => $req->notes,
                    'created_at' => $req->created_at,
                ];
            }),
        ]);
    }

    // ── Referrals Report ──────────────────────────────────────────────────────

    public function referrals(Request $request)
    {
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);

        $request->validate([
            'status' => ['nullable', 'string', 'in:pending_approval,approved,rejected'],
        ]);

        $query = ExternalReferral::with([
            'checkupRequest.employee.user',
            'externalProvider',
            'reviewedBy',
        ])->whereBetween('created_at', [$dateFrom, $dateTo]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $referrals = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'date_from' => $dateFrom->toDateString(),
            'date_to'   => $dateTo->toDateString(),
            'total'     => $referrals->count(),
            'referrals' => $referrals->map(function ($ref) {
                return [
                    'id'              => $ref->id,
                    'employee'        => [
                        'id'   => $ref->checkupRequest?->employee?->id,
                        'name' => $ref->checkupRequest?->employee?->user?->name,
                    ],
                    'provider'        => $ref->externalProvider?->name,
                    'specialty'       => $ref->specialty,
                    'reason'          => $ref->reason,
                    'status'          => $ref->status?->value,
                    'reviewed_by'     => $ref->reviewedBy?->name,
                    'reviewed_at'     => $ref->reviewed_at,
                    'created_at'      => $ref->created_at,
                ];
            }),
        ]);
    }

    // ── Sick Leaves Report ────────────────────────────────────────────────────

    public function sickLeaves(Request $request)
    {
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);

        $leaves = SickLeave::with(['checkupRequest.employee.user'])
            ->whereBetween('start_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json([
            'date_from'   => $dateFrom->toDateString(),
            'date_to'     => $dateTo->toDateString(),
            'total'       => $leaves->count(),
            'total_days'  => $leaves->sum('days_count'),
            'sick_leaves' => $leaves->map(function ($leave) {
                return [
                    'id'         => $leave->id,
                    'employee'   => [
                        'id'   => $leave->checkupRequest?->employee?->id,
                        'name' => $leave->checkupRequest?->employee?->user?->name,
                    ],
                    'days_count' => $leave->days_count,
                    'reason'     => $leave->reason,
                    'start_date' => $leave->start_date,
                ];
            }),
        ]);
    }

    // ── Monthly Treatments Report ─────────────────────────────────────────────

    public function monthlyTreatments(Request $request)
    {
        $request->validate([
            'month'  => ['nullable', 'date_format:Y-m'],
            'status' => ['nullable', 'string'],
        ]);

        $monthStr  = $request->filled('month') ? $request->month : Carbon::now()->format('Y-m');
        $monthDate = Carbon::createFromFormat('Y-m', $monthStr);
        $monthStart = $monthDate->copy()->startOfMonth()->toDateString();
        $monthEnd   = $monthDate->copy()->endOfMonth()->toDateString();

        // Active treatments
        $treatmentsQuery = MonthlyTreatment::with([
            'employee.user',
            'employee.department',
            'medications',
            'doctor',
        ]);

        if ($request->filled('status')) {
            $treatmentsQuery->where('status', $request->status);
        }

        $treatments = $treatmentsQuery->get();

        // Dispensing records for the requested month
        $dispensingRecords = MonthlyDispensingRecord::with(['monthlyTreatment.employee.user'])
            ->whereBetween('month', [$monthStart, $monthEnd])
            ->get();

        $dispensedCount = $dispensingRecords->where('status', 'dispensed')->count();
        $pendingCount   = $dispensingRecords->where('status', 'pending')->count();

        // Stats by status
        $byStatus = $treatments->groupBy(fn($t) => $t->status?->value ?? 'unknown')
            ->map->count();

        return response()->json([
            'month'           => $monthStr,
            'total_treatments' => $treatments->count(),
            'active'          => $treatments->where('status', MonthlyTreatmentStatus::Active->value)->count(),
            'by_status'       => $byStatus,
            'dispensing_this_month' => [
                'dispensed' => $dispensedCount,
                'pending'   => $pendingCount,
                'total'     => $dispensingRecords->count(),
            ],
            'treatments' => $treatments->map(function ($t) use ($monthStart, $monthEnd) {
                $monthRecord = $t->dispensingRecords
                    ->whereBetween('month', [$monthStart, $monthEnd])
                    ->first();

                return [
                    'id'              => $t->id,
                    'employee'        => [
                        'id'               => $t->employee?->id,
                        'name'             => $t->employee?->user?->name,
                        'financial_number' => $t->employee?->financial_number,
                        'department'       => $t->employee?->department?->name,
                    ],
                    'disease_name'    => $t->disease_name,
                    'status'          => $t->status?->value,
                    'review_type'     => $t->review_type?->value,
                    'beneficiary_type' => $t->beneficiary_type,
                    'doctor'          => $t->doctor?->name,
                    'medications'     => $t->medications->map(fn($m) => [
                        'medicine_name' => $m->medicine_name,
                        'dosage'        => $m->dosage,
                    ]),
                    'this_month_status' => $monthRecord?->status ?? 'no_record',
                    'dispensed_at'    => $monthRecord?->dispensed_at,
                    'last_reviewed_at' => $t->last_reviewed_at,
                    'created_at'      => $t->created_at,
                ];
            }),
        ]);
    }

    // ── Export ────────────────────────────────────────────────────────────────

    public function export(Request $request)
    {
        $request->validate([
            'type'   => ['required', 'in:daily,monthly,emergency,referrals,sick_leaves'],
            'format' => ['nullable', 'in:json,csv'],
        ]);

        $format = $request->get('format', 'json');

        if ($format === 'csv') {
            return $this->exportCsv($request);
        }

        return match ($request->type) {
            'daily'       => $this->daily($request),
            'monthly'     => $this->monthly($request),
            'emergency'   => $this->emergency($request),
            'referrals'   => $this->referrals($request),
            'sick_leaves' => $this->sickLeaves($request),
        };
    }

    private function exportCsv(Request $request)
    {
        $type = $request->type;
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);

        $rows = match ($type) {
            'daily', 'monthly', 'emergency' => $this->getRequestRows($type, $dateFrom, $dateTo),
            'referrals'  => $this->getReferralRows($dateFrom, $dateTo),
            'sick_leaves'=> $this->getSickLeaveRows($dateFrom, $dateTo),
        };

        $filename = "report_{$type}_{$dateFrom->toDateString()}.csv";

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($rows) {
            $file = fopen('php://output', 'w');
            // UTF-8 BOM for Excel Arabic support
            fputs($file, "\xEF\xBB\xBF");
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function getRequestRows(string $type, $dateFrom, $dateTo): array
    {
        $query = CheckupRequest::with(['employee.user', 'department'])
            ->whereBetween('created_at', [$dateFrom, $dateTo]);

        if ($type === 'emergency') {
            $query->where('type', CheckupType::Emergency->value);
        }

        $requests = $query->orderBy('created_at', 'desc')->get();

        $rows = [['رقم الطلب', 'الموظف', 'الإدارة', 'النوع', 'الحالة', 'الملاحظات', 'تاريخ الإنشاء']];

        foreach ($requests as $req) {
            $rows[] = [
                $req->id,
                $req->employee?->user?->name ?? '',
                $req->department?->name ?? '',
                $req->type?->value ?? '',
                $req->status?->value ?? '',
                $req->notes ?? '',
                $req->created_at?->format('Y-m-d H:i') ?? '',
            ];
        }

        return $rows;
    }

    private function getReferralRows($dateFrom, $dateTo): array
    {
        $referrals = ExternalReferral::with(['checkupRequest.employee.user', 'externalProvider'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->orderBy('created_at', 'desc')
            ->get();

        $rows = [['رقم التحويل', 'الموظف', 'التخصص', 'الجهة', 'الحالة', 'تاريخ الإنشاء']];

        foreach ($referrals as $ref) {
            $rows[] = [
                $ref->id,
                $ref->checkupRequest?->employee?->user?->name ?? '',
                $ref->specialty ?? '',
                $ref->externalProvider?->name ?? '',
                $ref->status?->value ?? '',
                $ref->created_at?->format('Y-m-d H:i') ?? '',
            ];
        }

        return $rows;
    }

    private function getSickLeaveRows($dateFrom, $dateTo): array
    {
        $leaves = SickLeave::with(['checkupRequest.employee.user'])
            ->whereBetween('start_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->orderBy('start_date', 'desc')
            ->get();

        $rows = [['رقم الراحة', 'الموظف', 'عدد الأيام', 'السبب', 'تاريخ البداية']];

        foreach ($leaves as $leave) {
            $rows[] = [
                $leave->id,
                $leave->checkupRequest?->employee?->user?->name ?? '',
                $leave->days_count,
                $leave->reason ?? '',
                $leave->start_date ?? '',
            ];
        }

        return $rows;
    }
}
