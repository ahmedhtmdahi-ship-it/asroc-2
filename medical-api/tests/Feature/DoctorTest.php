<?php

namespace Tests\Feature;

use App\Enums\CheckupStatus;
use App\Models\CheckupRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorTest extends TestCase
{
    use RefreshDatabase;

    private User $doctor;
    private User $employee;
    private CheckupRequest $checkedOutRequest;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->doctor   = User::where('email', 'doctor@test.com')->first();
        $this->employee = User::where('email', 'employee@test.com')->first();
        $manager        = User::where('email', 'manager@test.com')->first();
        $security       = User::where('email', 'security@test.com')->first();

        // Build a checked-out request ready for the doctor
        $requestId = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type' => 'normal', 'notes' => 'طلب كشف طبي',
        ])->json('data.id');

        $this->actingAs($manager)->postJson("/api/manager/requests/{$requestId}/approve");
        $this->actingAs($security)->postJson("/api/security/requests/{$requestId}/checkout");

        $this->checkedOutRequest = CheckupRequest::find($requestId);
    }

    public function test_doctor_can_see_queue(): void
    {
        $response = $this->actingAs($this->doctor)->getJson('/api/doctor/queue');

        $response->assertOk()->assertJsonStructure(['data']);
    }

    public function test_doctor_can_write_diagnosis(): void
    {
        $response = $this->actingAs($this->doctor)
            ->postJson("/api/doctor/requests/{$this->checkedOutRequest->id}/diagnose", [
                'diagnosis_text' => 'التهاب في الظهر - حالة بسيطة',
            ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', CheckupStatus::InDiagnosis->value);
    }

    public function test_doctor_can_write_prescription(): void
    {
        $this->actingAs($this->doctor)
            ->postJson("/api/doctor/requests/{$this->checkedOutRequest->id}/diagnose", [
                'diagnosis_text' => 'التهاب في الظهر',
            ]);

        $medicineId = \App\Models\Medicine::first()->id;

        $response = $this->actingAs($this->doctor)
            ->postJson("/api/doctor/requests/{$this->checkedOutRequest->id}/prescription", [
                'items' => [
                    ['medicine_id' => $medicineId, 'medicine_name' => 'باراسيتامول', 'dosage' => 'قرص مرتين يومياً', 'duration' => '7 أيام'],
                ],
            ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', CheckupStatus::Prescribed->value);
    }

    public function test_doctor_can_write_sick_leave(): void
    {
        $this->actingAs($this->doctor)
            ->postJson("/api/doctor/requests/{$this->checkedOutRequest->id}/diagnose", [
                'diagnosis_text' => 'راحة مرضية مطلوبة',
            ]);

        $response = $this->actingAs($this->doctor)
            ->postJson("/api/doctor/requests/{$this->checkedOutRequest->id}/sick-leave", [
                'days_count' => 3,
                'reason'     => 'حمى وتعب',
                'start_date' => now()->format('Y-m-d'),
            ]);

        $response->assertStatus(201);
    }

    public function test_employee_cannot_access_doctor_endpoints(): void
    {
        $this->actingAs($this->employee)
            ->getJson('/api/doctor/queue')
            ->assertForbidden();
    }
}
