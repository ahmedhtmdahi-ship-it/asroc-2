<?php

namespace App\Console\Commands;

use App\Services\MonthlyTreatmentService;
use Illuminate\Console\Command;

class CheckMonthlyTreatmentDue extends Command
{
    protected $signature = 'medical:check-monthly-treatments';
    protected $description = 'Generate monthly dispensing records for all active treatments';

    public function handle(MonthlyTreatmentService $service): void
    {
        $count = $service->generateMonthlyRecords();
        $this->info("Created {$count} monthly dispensing records.");
    }
}
