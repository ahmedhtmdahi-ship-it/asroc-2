<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checkup_requests', function (Blueprint $table) {
            // Auto-set from employee work_shift when request is created
            $table->enum('target_clinic', ['medical_center', 'shift_clinic'])->default('medical_center')->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('checkup_requests', function (Blueprint $table) {
            $table->dropColumn('target_clinic');
        });
    }
};
