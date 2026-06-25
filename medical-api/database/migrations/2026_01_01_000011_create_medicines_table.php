<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicines', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('active_ingredient')->nullable();
            $table->string('category')->nullable();
            $table->integer('current_stock')->default(0);
            $table->integer('minimum_stock')->default(10);
            $table->string('unit')->default('قرص');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicines');
    }
};
