<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_treatments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->enum('beneficiary_type', ['employee', 'pensioner']);
            $table->string('disease_name');
            $table->enum('status', ['active', 'paused', 'modified', 'discontinued'])->default('active');
            $table->enum('review_type', ['internal', 'external']);
            $table->date('last_reviewed_at')->nullable();
            $table->foreignId('doctor_id')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_treatments');
    }
};
