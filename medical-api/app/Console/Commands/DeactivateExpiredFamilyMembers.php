<?php

namespace App\Console\Commands;

use App\Enums\FamilyRelation;
use App\Models\FamilyMember;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class DeactivateExpiredFamilyMembers extends Command
{
    protected $signature = 'medical:deactivate-family-members';
    protected $description = 'Deactivate sons/daughters who have reached age limit';

    public function handle(): void
    {
        $ageLimit   = config('medical.son_age_limit', 26);
        $cutoffDate = Carbon::now()->subYears($ageLimit);

        $count = FamilyMember::where('is_active', true)
            ->whereIn('relation', [FamilyRelation::Son->value, FamilyRelation::Daughter->value])
            ->where('birth_date', '<=', $cutoffDate)
            ->update(['is_active' => false]);

        $this->info("Deactivated {$count} family members who exceeded age limit.");
    }
}
