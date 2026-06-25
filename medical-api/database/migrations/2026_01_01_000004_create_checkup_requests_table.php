<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkup_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->foreignId('department_id')->constrained('departments')->restrictOnDelete();
            $table->enum('type', ['normal', 'emergency']);
            $table->enum('status', [
                'pending', 'approved', 'rejected', 'cancelled', 'postponed',
                'checked_out', 'in_diagnosis', 'prescribed', 'dispensed',
                'returned', 'completed'
            ])->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->date('postponed_until')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->foreignId('security_officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkup_requests');
    }
};
