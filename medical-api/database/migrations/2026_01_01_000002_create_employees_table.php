<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('financial_number')->unique();
            $table->string('national_id', 14)->unique();
            $table->foreignId('department_id')->constrained('departments')->restrictOnDelete();
            $table->string('job_title');
            $table->enum('type', ['active', 'retired'])->default('active');
            $table->string('phone');
            $table->tinyInteger('checkups_used_this_month')->default(0);
            $table->date('checkup_month_reset')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
