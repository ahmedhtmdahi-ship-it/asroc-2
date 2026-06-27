<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $usersData = [
            [
                'name'     => 'موظف تجريبي',
                'email'    => 'employee@test.com',
                'password' => Hash::make('password'),
                'role'     => 'employee',
            ],
            [
                'name'     => 'صاحب معاش تجريبي',
                'email'    => 'retired@test.com',
                'password' => Hash::make('password'),
                'role'     => 'retired_employee',
            ],
            [
                'name'     => 'مدير إدارة تجريبي',
                'email'    => 'manager@test.com',
                'password' => Hash::make('password'),
                'role'     => 'manager',
            ],
            [
                'name'     => 'مدير مكتب تجريبي',
                'email'    => 'office.manager@test.com',
                'password' => Hash::make('password'),
                'role'     => 'office_manager',
            ],
            [
                'name'     => 'موظف أمن تجريبي',
                'email'    => 'security@test.com',
                'password' => Hash::make('password'),
                'role'     => 'security',
            ],
            [
                'name'     => 'طبيب المركز الطبي',
                'email'    => 'doctor@test.com',
                'password' => Hash::make('password'),
                'role'     => 'doctor',
            ],
            [
                'name'     => 'طبيب عيادة الوردية',
                'email'    => 'doctor.shift@test.com',
                'password' => Hash::make('password'),
                'role'     => 'doctor',
            ],
            [
                'name'     => 'صيدلية داخلية تجريبي',
                'email'    => 'internal.pharmacy@test.com',
                'password' => Hash::make('password'),
                'role'     => 'internal_pharmacy',
            ],
            [
                'name'     => 'صيدلية خارجية تجريبي',
                'email'    => 'external.pharmacy@test.com',
                'password' => Hash::make('password'),
                'role'     => 'external_pharmacy',
            ],
            [
                'name'     => 'إدارة طبية تجريبية',
                'email'    => 'medical.admin@test.com',
                'password' => Hash::make('password'),
                'role'     => 'medical_admin',
            ],
            [
                'name'     => 'مدير النظام',
                'email'    => 'admin@test.com',
                'password' => Hash::make('password'),
                'role'     => 'system_admin',
            ],
            [
                'name'     => 'الإدارة العليا',
                'email'    => 'top.management@test.com',
                'password' => Hash::make('password'),
                'role'     => 'top_management',
            ],
        ];

        $createdUsers = [];

        foreach ($usersData as $data) {
            $role = $data['role'];
            unset($data['role']);

            $user = User::create($data);
            $user->assignRole($role);

            $createdUsers[$role] = $user;
        }

        // Assign test manager as the manager of department 1 (so approval tests work)
        DB::table('departments')
            ->where('id', 1)
            ->update(['manager_id' => $createdUsers['manager']->id]);

        // Create Employee records
        DB::table('employees')->insert([
            [
                'user_id'          => $createdUsers['employee']->id,
                'financial_number' => 'EMP001',
                'national_id'      => '12345678901234',
                'department_id'    => 1,
                'job_title'        => 'موظف عام',
                'type'             => 'active',
                'work_shift'       => 'day',
                'clinic'           => null,
                'phone'            => '01000000001',
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'user_id'          => $createdUsers['retired_employee']->id,
                'financial_number' => 'RET001',
                'national_id'      => '43210987654321',
                'department_id'    => 2,
                'job_title'        => 'موظف متقاعد',
                'type'             => 'retired',
                'work_shift'       => 'day',
                'clinic'           => null,
                'phone'            => '01000000002',
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            // Doctor: Medical Center (day workers)
            [
                'user_id'          => $createdUsers['doctor']->id,
                'financial_number' => 'DOC001',
                'national_id'      => '11111111111111',
                'department_id'    => 1,
                'job_title'        => 'طبيب - المركز الطبي',
                'type'             => 'active',
                'work_shift'       => 'day',
                'clinic'           => 'medical_center',
                'phone'            => '01000000006',
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            // Second doctor: Shift Clinic (shift workers)
            [
                'user_id'          => User::where('email', 'doctor.shift@test.com')->first()?->id ?? 0,
                'financial_number' => 'DOC002',
                'national_id'      => '22222222222222',
                'department_id'    => 1,
                'job_title'        => 'طبيب - عيادة الوردية',
                'type'             => 'active',
                'work_shift'       => 'shift',
                'clinic'           => 'shift_clinic',
                'phone'            => '01000000012',
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
        ]);
    }
}
