<?php

namespace App\Console\Commands;

use App\Models\Department;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ImportUsers extends Command
{
    protected $signature = 'medical:import-users {--file= : JSON file path}';
    protected $description = 'Import real users from mockUsers JSON export';

    /**
     * Role mapping from frontend JSON roles to backend Spatie roles.
     */
    private array $roleMap = [
        'employee'      => 'employee',
        'manager'       => 'manager',
        'office_manager'=> 'office_manager',
        'security'      => 'security',
        'doctor'        => 'doctor',
        'pharmacy'      => 'internal_pharmacy',
        'medical_admin' => 'medical_admin',
        'pension_admin' => 'medical_admin',  // closest match
        'super_admin'   => 'system_admin',
    ];

    public function handle(): int
    {
        $filePath = $this->option('file')
            ?? base_path('storage/app/users_import.json');

        if (!file_exists($filePath)) {
            $this->error("JSON file not found: {$filePath}");
            return self::FAILURE;
        }

        $this->info("Reading JSON from: {$filePath}");
        $users = json_decode(file_get_contents($filePath), true);

        if (!is_array($users)) {
            $this->error('Failed to parse JSON file.');
            return self::FAILURE;
        }

        $this->info('Pre-creating departments...');
        $this->createDepartments($users);

        $imported   = 0;
        $skipped    = 0;
        $errors     = 0;
        $errorList  = [];

        $this->info('Importing users...');

        $this->withProgressBar($users, function (array $userData, $bar) use (
            &$imported, &$skipped, &$errors, &$errorList
        ) {
            $financialNumber = $userData['financialNumber'] ?? null;

            if (!$financialNumber) {
                $errors++;
                $errorList[] = "Missing financialNumber for user: " . ($userData['name'] ?? 'unknown');
                return;
            }

            // Skip users that already exist (check by financial_number)
            // ADMIN has no employee record — check by email instead
            if ($financialNumber === 'ADMIN') {
                $email = strtolower($financialNumber) . '@asorc.local';
                if (User::whereRaw('LOWER(email) = ?', [strtolower($email)])->exists()) {
                    $skipped++;
                    return;
                }
            } else {
                if (Employee::where('financial_number', $financialNumber)->exists()) {
                    $skipped++;
                    return;
                }
            }

            try {
                DB::transaction(function () use ($userData, $financialNumber, &$imported, &$errors, &$errorList) {
                    $email    = strtolower($financialNumber) . '@asorc.local';
                    $password = Hash::make($userData['password'] ?? $financialNumber);
                    $isActive = $userData['isActive'] ?? true;

                    $user = User::create([
                        'name'      => $userData['name'] ?? $financialNumber,
                        'email'     => $email,
                        'password'  => $password,
                        'is_active' => (bool) $isActive,
                    ]);

                    // Assign role
                    $frontendRole = $userData['role'] ?? 'employee';
                    $backendRole  = $this->roleMap[$frontendRole] ?? 'employee';
                    $user->assignRole($backendRole);

                    // ADMIN: no employee record
                    if ($financialNumber === 'ADMIN') {
                        $imported++;
                        return;
                    }

                    // Resolve department
                    $deptName   = $userData['department'] ?? 'عام';
                    $department = Department::firstOrCreate(['name' => $deptName]);

                    // national_id: use provided if 14 chars, otherwise generate fake
                    $nationalId = $userData['nationalId'] ?? null;
                    if (!$nationalId || strlen((string) $nationalId) !== 14) {
                        // Generate a unique fake national ID using the financial number
                        $nationalId = str_pad($financialNumber, 14, '0', STR_PAD_LEFT);
                        // If still not 14 chars (e.g. financialNumber is too long), truncate/hash
                        if (strlen($nationalId) > 14) {
                            $nationalId = substr(sprintf('%014d', crc32($financialNumber) & 0x7FFFFFFF), 0, 14);
                        }
                    }

                    // phone: use provided or empty string (column is NOT NULL)
                    $phone = $userData['phone'] ?? '';

                    // type: retired if role is 'retired_employee'
                    $type = ($userData['role'] ?? '') === 'retired_employee' ? 'retired' : 'active';

                    Employee::create([
                        'user_id'         => $user->id,
                        'financial_number'=> $financialNumber,
                        'national_id'     => $nationalId,
                        'department_id'   => $department->id,
                        'job_title'       => $userData['jobTitle'] ?? 'موظف',
                        'type'            => $type,
                        'phone'           => $phone,
                    ]);

                    $imported++;
                });
            } catch (\Throwable $e) {
                $errors++;
                $errorList[] = "Error importing {$financialNumber}: " . $e->getMessage();
            }
        });

        $this->newLine(2);
        $this->info("Import complete!");
        $this->table(
            ['Status', 'Count'],
            [
                ['Imported', $imported],
                ['Skipped (already exist)', $skipped],
                ['Errors', $errors],
            ]
        );

        if (!empty($errorList)) {
            $this->warn('Errors encountered:');
            foreach (array_slice($errorList, 0, 20) as $err) {
                $this->line("  - {$err}");
            }
            if (count($errorList) > 20) {
                $this->line('  ... and ' . (count($errorList) - 20) . ' more.');
            }
        }

        return self::SUCCESS;
    }

    /**
     * Pre-create all unique departments from the JSON data.
     */
    private function createDepartments(array $users): void
    {
        $departments = array_unique(array_filter(array_column($users, 'department')));

        foreach ($departments as $deptName) {
            Department::firstOrCreate(['name' => $deptName]);
        }

        $this->info('Departments ready: ' . count($departments));
    }
}
