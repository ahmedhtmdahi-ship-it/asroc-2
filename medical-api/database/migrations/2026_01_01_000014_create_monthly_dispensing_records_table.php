<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_dispensing_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_treatment_id')->constrained('monthly_treatments')->cascadeOnDelete();
            $table->date('month');
            $table->enum('status', ['pending', 'dispensed'])->default('pending');
            $table->foreignId('dispensed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('dispensed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_dispensing_records');
    }
};
