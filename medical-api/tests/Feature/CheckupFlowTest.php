<?php

namespace Tests\Feature;

use App\Enums\CheckupStatus;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckupFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $employee;
    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->employee = User::where('email', 'employee@test.com')->first();
        $this->manager  = User::where('email', 'manager@test.com')->first();
    }

    public function test_employee_can_create_normal_request(): void
    {
        $response = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'normal',
            'notes' => 'ألم في الظهر',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', CheckupStatus::Pending->value);
    }

    public function test_emergency_request_is_auto_approved(): void
    {
        $response = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'emergency',
            'notes' => 'حادث عمل',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', CheckupStatus::Approved->value);
    }

    public function test_employee_cannot_exceed_monthly_limit(): void
    {
        $employee = $this->employee->employee;

        // Force counter to the limit; also set the reset date so the service won't reset it
        $employee->update([
            'checkups_used_this_month' => 3,
            'checkup_month_reset'      => now()->startOfMonth(),
        ]);

        $response = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'normal',
            'notes' => 'الطلب الرابع - يجب رفضه',
        ]);

        $response->assertStatus(422);
    }

    public function test_emergency_bypasses_monthly_limit(): void
    {
        $employee = $this->employee->employee;
        $employee->update([
            'checkups_used_this_month' => 3,
            'checkup_month_reset'      => now()->startOfMonth(),
        ]);

        $response = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'emergency',
            'notes' => 'حالة طوارئ حقيقية',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.status', CheckupStatus::Approved->value);
    }

    public function test_manager_can_approve_request(): void
    {
        $createResponse = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'normal',
            'notes' => 'طلب للاعتماد',
        ]);
        $requestId = $createResponse->json('data.id');

        $response = $this->actingAs($this->manager)->postJson("/api/manager/requests/{$requestId}/approve");

        $response->assertOk()
                 ->assertJsonPath('data.status', CheckupStatus::Approved->value);
    }

    public function test_manager_can_reject_request_with_reason(): void
    {
        $createResponse = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'normal',
            'notes' => 'طلب للرفض',
        ]);
        $requestId = $createResponse->json('data.id');

        $response = $this->actingAs($this->manager)->postJson("/api/manager/requests/{$requestId}/reject", [
            'rejection_reason' => 'لا توجد ضرورة طبية',
        ]);

        $response->assertOk()
                 ->assertJsonPath('data.status', CheckupStatus::Rejected->value);
    }

    public function test_manager_can_postpone_request(): void
    {
        $createResponse = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'normal',
            'notes' => 'طلب للتأجيل',
        ]);
        $requestId = $createResponse->json('data.id');

        $response = $this->actingAs($this->manager)->postJson("/api/manager/requests/{$requestId}/postpone", [
            'postponed_until' => now()->addDays(7)->format('Y-m-d'),
        ]);

        $response->assertOk()
                 ->assertJsonPath('data.status', CheckupStatus::Postponed->value);
    }

    public function test_employee_can_cancel_pending_request(): void
    {
        $createResponse = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type'  => 'normal',
            'notes' => 'طلب لإلغائه',
        ]);
        $requestId = $createResponse->json('data.id');

        $response = $this->actingAs($this->employee)->deleteJson("/api/employee/requests/{$requestId}/cancel");

        $response->assertOk()
                 ->assertJsonPath('data.status', CheckupStatus::Cancelled->value);
    }

    public function test_employee_can_see_own_requests(): void
    {
        $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type' => 'normal', 'notes' => 'طلب 1',
        ]);

        $response = $this->actingAs($this->employee)->getJson('/api/employee/requests');

        $response->assertOk()->assertJsonStructure(['data']);
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }

    public function test_checkup_balance_decrements_on_normal_request(): void
    {
        $balanceBefore = $this->actingAs($this->employee)
            ->getJson('/api/employee/checkup-balance')
            ->json('remaining');

        $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type' => 'normal', 'notes' => 'طلب يخصم من الرصيد',
        ]);

        $balanceAfter = $this->actingAs($this->employee)
            ->getJson('/api/employee/checkup-balance')
            ->json('remaining');

        $this->assertEquals($balanceBefore - 1, $balanceAfter);
    }
}
