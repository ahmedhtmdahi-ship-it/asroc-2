# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## نظام إدارة الخدمات الطبية — ASORC Medical Services

A full-stack medical services management system for Assiut Oil Refining Company. Arabic-first, RTL UI. The frontend was originally mock-only; it is now progressively connected to the real Laravel API.

---

## Two Sub-projects

| | Frontend | Backend |
|---|---|---|
| Path | `/` (root) | `medical-api/` |
| Stack | React 18 + TypeScript + Vite + Tailwind 4 | PHP 8.3 + Laravel 13 + Sanctum + Spatie Permission |
| Package manager | `pnpm` | `composer` |
| Default port | `5173` | `8001` |

---

## Frontend Commands

```bash
# Install (use --ignore-scripts in headless/CI environments)
pnpm install --ignore-scripts

# Dev server
pnpm dev

# Type-check + build (no tsconfig.json — Vite IS the type checker)
pnpm run build
```

**There is no `tsconfig.json`.** Always use `pnpm run build` to verify TypeScript — `tsc --noEmit` does not work.

The `@` alias resolves to `./src` (configured in `vite.config.ts`).

---

## Backend Commands

All commands run from `medical-api/`:

```bash
cd medical-api

# Install
composer install

# Run dev server on port 8001
php artisan serve --port=8001

# Migrate + seed (creates SQLite DB + all test users)
php artisan migrate --seed

# Fresh reset
php artisan migrate:fresh --seed

# Run tests
php artisan test
# Single test
php artisan test --filter=TestClassName

# Code style (Laravel Pint)
./vendor/bin/pint
```

**Database:** SQLite by default (`database/database.sqlite`). File is auto-created by Laravel on first migrate.

---

## Test Users (password: `password`)

| Email | Backend Role | Frontend Role |
|---|---|---|
| `employee@test.com` | `employee` | `employee` |
| `retired@test.com` | `retired_employee` | `employee` |
| `manager@test.com` | `manager` | `manager` |
| `office.manager@test.com` | `office_manager` | `office_manager` |
| `security@test.com` | `security` | `security` |
| `doctor@test.com` | `doctor` | `doctor` |
| `internal.pharmacy@test.com` | `internal_pharmacy` | `pharmacy` |
| `external.pharmacy@test.com` | `external_pharmacy` | `pharmacy` |
| `medical.admin@test.com` | `medical_admin` | `medical_admin` |
| `admin@test.com` | `system_admin` | `super_admin` |

Login with `identifier` + `password` (POST `/api/auth/login`). The `identifier` field accepts email or financial_number.

---

## Frontend Architecture

### Provider Tree (`App.tsx`)
```
AuthProvider → WorkflowProvider → RouterProvider
```

### `AuthContext` (`src/app/features/auth/AuthContext.tsx`)
- Holds `user`, `isApiConnected`, `isLoading`
- On mount: if a Sanctum token exists in `localStorage`, calls `GET /auth/me` to restore session and set `isApiConnected = true`
- On login: tries real API first; falls back to `mockUsers` if API is unreachable
- Token stored at `localStorage.asorc_token`; user at `localStorage.asorc_current_user`

### `WorkflowContext` (`src/app/context/WorkflowContext.tsx`)
- Central state for **all** medical requests across the app
- Role-aware fetch: employees get `/employee/requests`, managers get `/manager/requests`, doctors get `/doctor/queue`, pharmacy gets `/internal-pharmacy/prescriptions`, etc.
- `moveRequest(id, nextStatus, note)` — dispatches the correct API call based on status transition (approve/reject/postpone/checkout/return/dispense). Falls back to the mock `requestStore` if `isApiConnected` is false
- **All pages consume this context via `useWorkflow()`** — they do not fetch requests themselves

### Role Mapping (backend → frontend)
```
system_admin    → super_admin
internal_pharmacy / external_pharmacy → pharmacy
retired_employee → employee
top_management  → super_admin
(all others are 1-to-1)
```
Defined in `src/app/services/authService.ts → mapBackendRole()`.

### API Layer (`src/app/services/`)
- `apiClient.ts` — bare fetch wrapper (GET/POST/PUT/DELETE), reads Bearer token from `localStorage.asorc_token`. Exports `API_URL` constant (default: `http://localhost:8001/api`, override with `VITE_API_URL` env var)
- `authService.ts` — login, logout, me, saveToken, getToken
- `checkupService.ts` — all domain endpoints (employee balance, manager approvals, security checkout, doctor diagnose/prescribe/referral, pharmacy dispense, medicine CRUD, referral approve/reject, etc.)
- `notificationService.ts` — notifications CRUD
- `reportService.ts` — report endpoints

### Mock Stores (`src/app/store/`)
These are localStorage-backed fallbacks used when `isApiConnected` is false:
- `requestStore` — MedicalRequest CRUD
- `medicineStore` — medicines/inventory
- `notificationStore` — notifications
- `securityStore` / `auditStore` — local-only logs (no backend equivalent)

Pages always prefer the API; the stores are only reached on error or when offline.

---

## Backend Architecture

### Authentication
Laravel Sanctum (API tokens, guard `web`). Roles/permissions managed by Spatie `laravel-permission`.

### Request Lifecycle (status flow)
```
pending → approved → checked_out → in_diagnosis → prescribed → dispensed → returned → completed
         ↘ rejected / postponed / cancelled
```
Emergency requests skip `pending → approved` (auto-approved, not counted against the monthly limit of 3).

### Key Business Rules (`config/medical.php`)
- `monthly_checkup_limit` = 3 (normal checkups per employee per month)
- `son_age_limit` = 26 (family member eligibility cutoff)
- `late_threshold_hours` = 3 (security late-employee alert threshold)

### Enums (`app/Enums/`)
`CheckupStatus`, `CheckupType`, `EmployeeType`, `FamilyRelation`, `MonthlyTreatmentStatus`, `ReferralStatus`, `ExternalProviderType`, `ReviewType`, `DispensingMonth` — all are PHP backed enums (string).

### Controller → Route Mapping
All routes are in `routes/api.php` under `auth:sanctum` middleware. Route prefixes match the frontend service calls exactly:
- `/employee/*` → `CheckupRequestController`, `EmployeeController`
- `/manager/*` → `ManagerApprovalController`
- `/security/*` → `SecurityController`
- `/doctor/*` → `DoctorController`, `DiagnosisController`, `PrescriptionController`, `SickLeaveController`, `ExternalReferralController`
- `/medical-admin/*` → `ExternalReferralController`, `ManagerApprovalController`
- `/internal-pharmacy/*` → `InternalPharmacyController`
- `/external-pharmacy/*` → `ExternalPharmacyController`
- `/medicines/*` → `MedicineController` (full CRUD)
- `/monthly-treatments/*` → `MonthlyTreatmentController`
- `/admin/*` → `UserController`, `DepartmentController`, `EmployeeAdminController`

### PDF Generation
`PdfService` uses `barryvdh/laravel-dompdf` to generate referral PDFs. Files stored at `storage/app/referrals/`. Triggered on `POST /medical-admin/referrals/{id}/approve`.

---

## Adding a New API-Connected Feature

1. **Backend**: Add controller method + route in `routes/api.php`
2. **Frontend service**: Add method to the relevant service in `src/app/services/checkupService.ts`
3. **Page/component**: Call the service inside a `useEffect` guarded by `isApiConnected`; always include a fallback to the local mock store
4. **Build check**: Run `pnpm run build` to confirm no TypeScript errors

Pattern used throughout the codebase:
```tsx
useEffect(() => {
  if (!isApiConnected) { /* use local mock */ return; }
  someService.getData()
    .then((res: any) => { /* handle */ })
    .catch(() => { /* silent fallback */ });
}, [isApiConnected]);
```
