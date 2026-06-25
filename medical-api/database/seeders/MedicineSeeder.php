<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MedicineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $medicines = [
            [
                'name'             => 'باراسيتامول 500مج',
                'active_ingredient' => 'باراسيتامول',
                'category'         => 'مسكنات',
                'current_stock'    => 500,
                'minimum_stock'    => 50,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'أموكسيسيلين 500مج',
                'active_ingredient' => 'أموكسيسيلين',
                'category'         => 'مضادات حيوية',
                'current_stock'    => 200,
                'minimum_stock'    => 30,
                'unit'             => 'كبسولة',
            ],
            [
                'name'             => 'أوميبرازول 20مج',
                'active_ingredient' => 'أوميبرازول',
                'category'         => 'أدوية المعدة',
                'current_stock'    => 300,
                'minimum_stock'    => 40,
                'unit'             => 'كبسولة',
            ],
            [
                'name'             => 'أتورفاستاتين 40مج',
                'active_ingredient' => 'أتورفاستاتين',
                'category'         => 'أدوية الكوليسترول',
                'current_stock'    => 150,
                'minimum_stock'    => 20,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'ميتفورمين 500مج',
                'active_ingredient' => 'ميتفورمين',
                'category'         => 'أدوية السكري',
                'current_stock'    => 400,
                'minimum_stock'    => 50,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'أملوديبين 5مج',
                'active_ingredient' => 'أملوديبين',
                'category'         => 'أدوية القلب والضغط',
                'current_stock'    => 250,
                'minimum_stock'    => 30,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'إيبوبروفين 400مج',
                'active_ingredient' => 'إيبوبروفين',
                'category'         => 'مسكنات',
                'current_stock'    => 350,
                'minimum_stock'    => 40,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'لوزارتان 50مج',
                'active_ingredient' => 'لوزارتان',
                'category'         => 'أدوية القلب والضغط',
                'current_stock'    => 200,
                'minimum_stock'    => 25,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'سيتريزين 10مج',
                'active_ingredient' => 'سيتريزين',
                'category'         => 'مضادات الحساسية',
                'current_stock'    => 180,
                'minimum_stock'    => 20,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'أزيثروميسين 500مج',
                'active_ingredient' => 'أزيثروميسين',
                'category'         => 'مضادات حيوية',
                'current_stock'    => 100,
                'minimum_stock'    => 15,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'ديكلوفيناك 50مج',
                'active_ingredient' => 'ديكلوفيناك',
                'category'         => 'مضادات الالتهاب',
                'current_stock'    => 280,
                'minimum_stock'    => 35,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'رانيتيدين 150مج',
                'active_ingredient' => 'رانيتيدين',
                'category'         => 'أدوية المعدة',
                'current_stock'    => 220,
                'minimum_stock'    => 30,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'ليفوثيروكسين 50مج',
                'active_ingredient' => 'ليفوثيروكسين',
                'category'         => 'أدوية الغدة الدرقية',
                'current_stock'    => 130,
                'minimum_stock'    => 20,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'ميترونيدازول 250مج',
                'active_ingredient' => 'ميترونيدازول',
                'category'         => 'مضادات حيوية',
                'current_stock'    => 160,
                'minimum_stock'    => 20,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'فيتامين سي 1000مج',
                'active_ingredient' => 'حمض الأسكوربيك',
                'category'         => 'فيتامينات',
                'current_stock'    => 400,
                'minimum_stock'    => 50,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'كالسيوم + فيتامين د',
                'active_ingredient' => 'كالسيوم كربونات',
                'category'         => 'فيتامينات ومعادن',
                'current_stock'    => 200,
                'minimum_stock'    => 25,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'أسبرين 81مج',
                'active_ingredient' => 'حمض الأسيتيل ساليسيليك',
                'category'         => 'مضادات التخثر',
                'current_stock'    => 350,
                'minimum_stock'    => 40,
                'unit'             => 'قرص',
            ],
            [
                'name'             => 'بنزيل بنسلين حقن',
                'active_ingredient' => 'بنسلين',
                'category'         => 'مضادات حيوية',
                'current_stock'    => 50,
                'minimum_stock'    => 10,
                'unit'             => 'أمبولة',
            ],
            [
                'name'             => 'ديكساميثازون 4مج',
                'active_ingredient' => 'ديكساميثازون',
                'category'         => 'كورتيزون',
                'current_stock'    => 80,
                'minimum_stock'    => 10,
                'unit'             => 'حقنة',
            ],
            [
                'name'             => 'سالبوتامول بخاخ',
                'active_ingredient' => 'سالبوتامول',
                'category'         => 'أدوية الربو',
                'current_stock'    => 40,
                'minimum_stock'    => 8,
                'unit'             => 'بخاخ',
            ],
        ];

        DB::table('medicines')->insert($medicines);
    }
}
