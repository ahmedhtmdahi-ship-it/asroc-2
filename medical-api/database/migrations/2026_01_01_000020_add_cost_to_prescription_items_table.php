<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->foreignId('medicine_batch_id')->nullable()->constrained('medicine_batches')->nullOnDelete()->after('medicine_id');
            $table->decimal('unit_cost', 10, 2)->default(0)->after('is_available');
            $table->integer('quantity_dispensed')->default(1)->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->dropForeign(['medicine_batch_id']);
            $table->dropColumn(['medicine_batch_id', 'unit_cost', 'quantity_dispensed']);
        });
    }
};
