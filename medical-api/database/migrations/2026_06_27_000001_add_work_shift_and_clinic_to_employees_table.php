<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Day worker → Medical Center | Shift worker → Shift Clinic
            $table->enum('work_shift', ['day', 'shift'])->default('day')->after('phone');
            // For doctor employees: which clinic are they assigned to
            $table->enum('clinic', ['medical_center', 'shift_clinic'])->nullable()->after('work_shift');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['work_shift', 'clinic']);
        });
    }
};
