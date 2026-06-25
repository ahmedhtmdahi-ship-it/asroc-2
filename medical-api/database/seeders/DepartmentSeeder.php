<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            ['name' => 'إدارة الموارد البشرية',        'manager_id' => null],
            ['name' => 'إدارة المالية والحسابات',       'manager_id' => null],
            ['name' => 'إدارة تقنية المعلومات',         'manager_id' => null],
            ['name' => 'إدارة الشؤون القانونية',        'manager_id' => null],
            ['name' => 'إدارة المشتريات والتوريد',      'manager_id' => null],
            ['name' => 'إدارة العلاقات العامة',         'manager_id' => null],
            ['name' => 'إدارة التدريب والتطوير',        'manager_id' => null],
            ['name' => 'إدارة المشاريع والهندسة',       'manager_id' => null],
            ['name' => 'إدارة الجودة والتميز',          'manager_id' => null],
            ['name' => 'إدارة الأمن والسلامة',          'manager_id' => null],
            ['name' => 'إدارة الخدمات الطبية',          'manager_id' => null],
            ['name' => 'إدارة شؤون الموظفين',           'manager_id' => null],
            ['name' => 'إدارة المخازن والمستودعات',     'manager_id' => null],
            ['name' => 'إدارة الاستقبال والخدمات',      'manager_id' => null],
            ['name' => 'إدارة التخطيط والمتابعة',       'manager_id' => null],
            ['name' => 'إدارة العمليات والإنتاج',       'manager_id' => null],
            ['name' => 'إدارة المبيعات والتسويق',       'manager_id' => null],
            ['name' => 'إدارة خدمة العملاء',            'manager_id' => null],
            ['name' => 'إدارة البحث والتطوير',          'manager_id' => null],
            ['name' => 'الإدارة العامة',                'manager_id' => null],
        ];

        DB::table('departments')->insert($departments);
    }
}
