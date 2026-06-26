<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\EmployeeAdminController;
use App\Http\Controllers\CheckupRequestController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\FamilyMemberController;
use App\Http\Controllers\ManagerApprovalController;
use App\Http\Controllers\SecurityController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\DiagnosisController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\SickLeaveController;
use App\Http\Controllers\ExternalReferralController;
use App\Http\Controllers\InternalPharmacyController;
use App\Http\Controllers\ExternalPharmacyController;
use App\Http\Controllers\MedicineController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\MedicineBatchController;
use App\Http\Controllers\PharmacyCostReportController;
use App\Http\Controllers\MonthlyTreatmentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ExternalProviderController;

// ── Auth Routes ──────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/fcm-token', [AuthController::class, 'updateFcmToken']);
    });
});

// ── Protected Routes ─────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── Employee Profile & Checkup Requests ──────────────────
    Route::prefix('employee')->group(function () {
        Route::get('/profile', [EmployeeController::class, 'profile']);
        Route::put('/profile', [EmployeeController::class, 'updateProfile']);
        Route::get('/checkup-balance', [EmployeeController::class, 'checkupBalance']);

        Route::get('/requests', [CheckupRequestController::class, 'index']);
        Route::post('/requests', [CheckupRequestController::class, 'store']);
        Route::get('/requests/{id}', [CheckupRequestController::class, 'show']);
        Route::delete('/requests/{id}/cancel', [CheckupRequestController::class, 'cancel']);
    });

    // ── Manager Approval ──────────────────────────────────────
    Route::prefix('manager')->group(function () {
        Route::get('/requests', [ManagerApprovalController::class, 'index']);
        Route::get('/requests/all', [ManagerApprovalController::class, 'allRequests']);
        Route::post('/requests/{id}/approve', [ManagerApprovalController::class, 'approve']);
        Route::post('/requests/{id}/reject', [ManagerApprovalController::class, 'reject']);
        Route::post('/requests/{id}/postpone', [ManagerApprovalController::class, 'postpone']);
    });

    // ── Family Members (retired_employee) ─────────────────────
    Route::apiResource('family-members', FamilyMemberController::class);

    // ── Admin: Users, Departments, Employees, Audit Logs ──────
    Route::prefix('admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('users/{id}/toggle-status', [UserController::class, 'toggleStatus']);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('employees', EmployeeAdminController::class);
        Route::get('employees/{id}/family-members', [EmployeeAdminController::class, 'familyMembers']);
        Route::get('audit-logs', [AuditLogController::class, 'index']);
    });

    // ── Security ──────────────────────────────────────────────────
    Route::prefix('security')->group(function () {
        Route::get('/approved-requests', [SecurityController::class, 'approvedRequests']);
        Route::get('/outside-now', [SecurityController::class, 'outsideNow']);
        Route::get('/late-employees', [SecurityController::class, 'lateEmployees']);
        Route::post('/requests/{id}/checkout', [SecurityController::class, 'checkout']);
        Route::post('/requests/{id}/return', [SecurityController::class, 'return']);
        Route::get('/logs', [SecurityController::class, 'logs']);
    });

    // ── Doctor ────────────────────────────────────────────────────
    Route::prefix('doctor')->group(function () {
        Route::get('/queue', [DoctorController::class, 'queue']);
        Route::get('/requests/{id}', [DoctorController::class, 'show']);
        Route::post('/requests/{id}/diagnose', [DiagnosisController::class, 'store']);
        Route::post('/requests/{id}/prescription', [PrescriptionController::class, 'store']);
        Route::post('/requests/{id}/referral', [ExternalReferralController::class, 'store']);
        Route::post('/requests/{id}/sick-leave', [SickLeaveController::class, 'store']);
    });

    // ── Medical Admin (Referrals) ─────────────────────────────────
    Route::prefix('medical-admin')->group(function () {
        Route::get('/referrals', [ExternalReferralController::class, 'pending']);
        Route::post('/referrals/{id}/approve', [ExternalReferralController::class, 'approve']);
        Route::post('/referrals/{id}/reject', [ExternalReferralController::class, 'reject']);
        Route::get('/referrals/{id}/pdf', [ExternalReferralController::class, 'downloadPdf']);
        Route::get('/requests', [ManagerApprovalController::class, 'globalRequests']);
    });

    // ── Internal Pharmacy ─────────────────────────────────────────
    Route::prefix('internal-pharmacy')->group(function () {
        Route::get('/prescriptions', [InternalPharmacyController::class, 'index']);
        Route::get('/prescriptions/{id}', [InternalPharmacyController::class, 'show']);
        Route::post('/prescriptions/{id}/dispense', [InternalPharmacyController::class, 'dispense']);
    });

    // ── External Pharmacy ─────────────────────────────────────────
    Route::prefix('external-pharmacy')->group(function () {
        Route::get('/monthly-treatments', [ExternalPharmacyController::class, 'monthlyTreatments']);
        Route::post('/treatments/{id}/dispense', [ExternalPharmacyController::class, 'dispense']);
        Route::get('/search-beneficiary', [ExternalPharmacyController::class, 'searchBeneficiary']);
    });

    // ── Medicines ─────────────────────────────────────────────────
    Route::prefix('medicines')->group(function () {
        Route::get('/', [MedicineController::class, 'index']);
        Route::post('/', [MedicineController::class, 'store']);
        Route::get('/low-stock', [MedicineController::class, 'lowStock']);
        Route::post('/import', [MedicineController::class, 'import']);
        Route::get('/{id}', [MedicineController::class, 'show']);
        Route::put('/{id}', [MedicineController::class, 'update']);
        Route::delete('/{id}', [MedicineController::class, 'destroy']);
        Route::get('/{id}/alternatives', [MedicineController::class, 'alternatives']);
    });

    // ── Suppliers ─────────────────────────────────────────────────
    Route::prefix('suppliers')->group(function () {
        Route::get('/', [SupplierController::class, 'index']);
        Route::post('/', [SupplierController::class, 'store']);
        Route::get('/{id}', [SupplierController::class, 'show']);
        Route::put('/{id}', [SupplierController::class, 'update']);
        Route::delete('/{id}', [SupplierController::class, 'destroy']);
        Route::post('/{id}/toggle-status', [SupplierController::class, 'toggleStatus']);
    });

    // ── Medicine Batches (Inventory) ──────────────────────────────
    Route::prefix('medicine-batches')->group(function () {
        Route::get('/', [MedicineBatchController::class, 'index']);
        Route::post('/', [MedicineBatchController::class, 'store']);
        Route::get('/expiring-soon', [MedicineBatchController::class, 'expiringSoon']);
        Route::get('/expired', [MedicineBatchController::class, 'expired']);
        Route::get('/{id}', [MedicineBatchController::class, 'show']);
        Route::post('/{id}/adjust', [MedicineBatchController::class, 'adjust']);
    });

    // ── Pharmacy Cost Reports ─────────────────────────────────────
    Route::prefix('pharmacy-reports')->group(function () {
        Route::get('/monthly', [PharmacyCostReportController::class, 'monthly']);
        Route::get('/inventory-value', [PharmacyCostReportController::class, 'inventoryValue']);
    });

    // ── Monthly Treatments ────────────────────────────────────────
    Route::prefix('monthly-treatments')->group(function () {
        Route::get('/', [MonthlyTreatmentController::class, 'index']);
        Route::post('/', [MonthlyTreatmentController::class, 'store']);
        Route::get('/{id}', [MonthlyTreatmentController::class, 'show']);
        Route::put('/{id}', [MonthlyTreatmentController::class, 'update']);
        Route::post('/{id}/pause', [MonthlyTreatmentController::class, 'pause']);
        Route::post('/{id}/discontinue', [MonthlyTreatmentController::class, 'discontinue']);
        Route::get('/{id}/history', [MonthlyTreatmentController::class, 'dispensingHistory']);
    });

    // ── Notifications ─────────────────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('/{id}/read', [NotificationController::class, 'markRead']);
    });

    // ── Reports ───────────────────────────────────────────────────
    Route::prefix('reports')->group(function () {
        Route::get('/dashboard', [ReportController::class, 'dashboard']);
        Route::get('/daily', [ReportController::class, 'daily']);
        Route::get('/monthly', [ReportController::class, 'monthly']);
        Route::get('/emergency', [ReportController::class, 'emergency']);
        Route::get('/referrals', [ReportController::class, 'referrals']);
        Route::get('/sick-leaves', [ReportController::class, 'sickLeaves']);
        Route::get('/monthly-treatments', [ReportController::class, 'monthlyTreatments']);
        Route::get('/export', [ReportController::class, 'export']);
    });

    // ── External Providers ────────────────────────────────────────
    Route::apiResource('external-providers', ExternalProviderController::class);

});
