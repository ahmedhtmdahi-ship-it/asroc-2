<?php

namespace Tests\Feature;

use App\Enums\CheckupStatus;
use App\Models\CheckupRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    private User $security;
    private User $employee;
    private CheckupRequest $approvedRequest;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->security = User::where('email', 'security@test.com')->first();
        $this->employee = User::where('email', 'employee@test.com')->first();
        $manager        = User::where('email', 'manager@test.com')->first();

        // Create an approved request for security to act on
        $requestId = $this->actingAs($this->employee)->postJson('/api/employee/requests', [
            'type' => 'normal', 'notes' => 'طلب للأمن',
        ])->json('data.id');

        $this->actingAs($manager)->postJson("/api/manager/requests/{$requestId}/approve");

        $this->approvedRequest = CheckupRequest::find($requestId);
    }

    public function test_security_can_see_approved_requests(): void
    {
        $response = $this->actingAs($this->security)->getJson('/api/security/approved-requests');

        $response->assertOk()->assertJsonStructure(['data']);
    }

    public function test_security_can_checkout_approved_request(): void
    {
        $response = $this->actingAs($this->security)
            ->postJson("/api/security/requests/{$this->approvedRequest->id}/checkout");

        $response->assertOk()
                 ->assertJsonPath('data.status', CheckupStatus::CheckedOut->value);
    }

    public function test_security_can_register_return(): void
    {
        $this->actingAs($this->security)
            ->postJson("/api/security/requests/{$this->approvedRequest->id}/checkout");

        $response = $this->actingAs($this->security)
            ->postJson("/api/security/requests/{$this->approvedRequest->id}/return");

        $response->assertOk()
                 ->assertJsonPath('data.status', CheckupStatus::Returned->value);
    }

    public function test_security_can_see_outside_employees(): void
    {
        $this->actingAs($this->security)
            ->postJson("/api/security/requests/{$this->approvedRequest->id}/checkout");

        $response = $this->actingAs($this->security)->getJson('/api/security/outside-now');

        $response->assertOk()->assertJsonStructure(['data']);
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }

    public function test_employee_cannot_access_security_endpoints(): void
    {
        $this->actingAs($this->employee)
            ->postJson("/api/security/requests/{$this->approvedRequest->id}/checkout")
            ->assertForbidden();
    }
}
