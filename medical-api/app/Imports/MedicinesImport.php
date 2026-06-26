<?php

namespace App\Imports;

use App\Models\Medicine;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class MedicinesImport implements ToModel, WithHeadingRow
{
    public function model(array $row): ?Medicine
    {
        if (empty($row['name'])) return null;

        return Medicine::updateOrCreate(
            ['name' => $row['name']],
            [
                'active_ingredient' => $row['active_ingredient'] ?? null,
                'category' => $row['category'] ?? null,
                'current_stock' => $row['current_stock'] ?? 0,
                'minimum_stock' => $row['minimum_stock'] ?? 10,
                'unit' => $row['unit'] ?? 'قرص',
            ]
        );
    }
}
