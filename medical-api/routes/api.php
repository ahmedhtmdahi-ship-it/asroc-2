<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
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

    // ── Admin: Users, Departments, Employees ──────────────────
    Route::prefix('admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('users/{id}/toggle-status', [UserController::class, 'toggleStatus']);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('employees', EmployeeAdminController::class);
    });

    // ── Security ──────────────────────────────────────────────────
    Route::prefix('security')->group(function () {
        Route::get('/approved-requests', [SecurityController::class, 'approvedRequests']);
        Route::get('/outside-now', [SecurityController::class, 'outsideNow']);
        Route::get('/late-employees', [SecurityController::class, 'lateEmployees']);
        Route::post('/requests/{id}/checkout', [SecurityController::class, 'checkout']);
        Route::post('/requests/{id}/return', [SecurityController::class, 'return']);
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
    });

});
