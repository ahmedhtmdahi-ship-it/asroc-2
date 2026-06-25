<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $guard = 'web';

        // Create roles
        $roles = [
            'employee',
            'retired_employee',
            'manager',
            'office_manager',
            'security',
            'doctor',
            'internal_pharmacy',
            'external_pharmacy',
            'medical_admin',
            'system_admin',
            'top_management',
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => $guard]);
        }

        // Define permissions and which roles they belong to
        $permissionsMap = [
            'view_own_requests'          => ['employee', 'retired_employee'],
            'create_checkup_request'     => ['employee', 'retired_employee', 'medical_admin'],
            'cancel_own_request'         => ['employee', 'retired_employee'],
            'manage_family_members'      => ['retired_employee', 'medical_admin'],
            'approve_requests'           => ['manager', 'office_manager'],
            'reject_requests'            => ['manager', 'office_manager'],
            'postpone_requests'          => ['manager', 'office_manager'],
            'view_all_requests'          => ['manager', 'office_manager', 'medical_admin', 'system_admin', 'top_management'],
            'security_checkout'          => ['security'],
            'security_return'            => ['security'],
            'view_security_list'         => ['security'],
            'diagnose_patients'          => ['doctor'],
            'write_prescription'         => ['doctor'],
            'write_referral'             => ['doctor'],
            'write_sick_leave'           => ['doctor'],
            'manage_monthly_treatments'  => ['doctor', 'medical_admin'],
            'dispense_medications'       => ['internal_pharmacy'],
            'dispense_monthly_treatment' => ['external_pharmacy'],
            'approve_referrals'          => ['medical_admin'],
            'view_referral_pdf'          => ['medical_admin', 'doctor'],
            'manage_medicines'           => ['medical_admin', 'system_admin'],
            'manage_external_providers'  => ['medical_admin', 'system_admin'],
            'manage_users'               => ['system_admin'],
            'manage_departments'         => ['system_admin'],
            'manage_employees'           => ['system_admin', 'medical_admin'],
            'view_reports'               => ['top_management', 'medical_admin', 'system_admin'],
            'view_notifications'         => [
                'employee', 'retired_employee', 'manager', 'office_manager',
                'security', 'doctor', 'internal_pharmacy', 'external_pharmacy',
                'medical_admin', 'system_admin',
            ],
        ];

        foreach ($permissionsMap as $permissionName => $roleNames) {
            $permission = Permission::firstOrCreate([
                'name'       => $permissionName,
                'guard_name' => $guard,
            ]);

            foreach ($roleNames as $roleName) {
                $role = Role::where('name', $roleName)->where('guard_name', $guard)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }
    }
}
