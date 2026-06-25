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

});
