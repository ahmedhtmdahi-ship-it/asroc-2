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
                'name'     => 'طبيب تجريبي',
                'email'    => 'doctor@test.com',
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

        // Create Employee record for the active employee
        DB::table('employees')->insert([
            'user_id'          => $createdUsers['employee']->id,
            'financial_number' => 'EMP001',
            'national_id'      => '12345678901234',
            'department_id'    => 1,
            'job_title'        => 'موظف عام',
            'type'             => 'active',
            'phone'            => '01000000001',
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        // Create Employee record for the retired employee
        DB::table('employees')->insert([
            'user_id'          => $createdUsers['retired_employee']->id,
            'financial_number' => 'RET001',
            'national_id'      => '43210987654321',
            'department_id'    => 2,
            'job_title'        => 'موظف متقاعد',
            'type'             => 'retired',
            'phone'            => '01000000002',
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }
}
