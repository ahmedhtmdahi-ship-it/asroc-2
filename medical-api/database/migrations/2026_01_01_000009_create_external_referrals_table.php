<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkup_request_id')->constrained('checkup_requests')->cascadeOnDelete();
            $table->foreignId('external_provider_id')->constrained('external_providers')->restrictOnDelete();
            $table->string('specialty');
            $table->text('reason');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending_approval', 'approved', 'rejected'])->default('pending_approval');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_referrals');
    }
};
