<?php

namespace Tests\Feature;

use App\Enums\CheckupStatus;
use App\Models\CheckupRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PharmacyTest extends TestCase
{
    use RefreshDatabase;

    private User $pharmacy;
    private User $employee;
    private CheckupRequest $prescribedRequest;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->pharmacy = User::where('email', 'internal.pharmacy@test.com')->first();
        $this->employee = User::where('email', 'employee@test.com')->first();
        $manager        = User::where('email', 'manager@test.com')->first();
        $security       = User::where('email', 'security@test.com')->first();
        $doctor         = User::where('email', 'doctor@test.com')->first();

        // Build a prescribed request ready for the pharmacy
        $requestId = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type' => 'normal', 'notes' => 'طلب للصيدلية',
        ])->json('data.id');

        $this->actingAs($manager)->postJson("/api/manager/requests/{$requestId}/approve");
        $this->actingAs($security)->postJson("/api/security/requests/{$requestId}/checkout");

        $this->actingAs($doctor)->postJson("/api/doctor/requests/{$requestId}/diagnose", [
            'diagnosis_text' => 'التهاب',
        ]);

        $medicineId = \App\Models\Medicine::first()->id;

        $this->actingAs($doctor)->postJson("/api/doctor/requests/{$requestId}/prescription", [
            'items' => [
                ['medicine_id' => $medicineId, 'medicine_name' => 'باراسيتامول', 'dosage' => 'قرص مرتين', 'duration' => '5 أيام'],
            ],
        ]);

        $this->prescribedRequest = CheckupRequest::find($requestId);
    }

    public function test_pharmacy_can_see_pending_prescriptions(): void
    {
        $response = $this->actingAs($this->pharmacy)->getJson('/api/internal-pharmacy/prescriptions');

        $response->assertOk()->assertJsonStructure(['data']);
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }

    public function test_pharmacy_can_dispense_prescription(): void
    {
        $prescription = $this->prescribedRequest->prescription;

        $response = $this->actingAs($this->pharmacy)
            ->postJson("/api/internal-pharmacy/prescriptions/{$prescription->id}/dispense");

        $response->assertOk()
                 ->assertJsonPath('data.status', CheckupStatus::Dispensed->value);
    }

    public function test_pharmacy_can_get_prescription_details(): void
    {
        $prescription = $this->prescribedRequest->prescription;

        $response = $this->actingAs($this->pharmacy)
            ->getJson("/api/internal-pharmacy/prescriptions/{$prescription->id}");

        $response->assertOk()->assertJsonStructure(['data' => ['items']]);
    }

    public function test_employee_cannot_dispense_prescriptions(): void
    {
        $prescription = $this->prescribedRequest->prescription;

        $this->actingAs($this->employee)
            ->postJson("/api/internal-pharmacy/prescriptions/{$prescription->id}/dispense")
            ->assertForbidden();
    }

    public function test_full_checkup_workflow_status_progression(): void
    {
        $prescription = $this->prescribedRequest->prescription;

        $this->actingAs($this->pharmacy)
            ->postJson("/api/internal-pharmacy/prescriptions/{$prescription->id}/dispense");

        $this->prescribedRequest->refresh();
        $this->assertEquals(CheckupStatus::Dispensed->value, $this->prescribedRequest->status->value);
    }
}
