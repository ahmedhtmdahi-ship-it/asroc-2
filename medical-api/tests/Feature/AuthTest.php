<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_employee_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'employee@test.com',
            'password'   => 'password',
        ]);

        $response->assertOk()
                 ->assertJsonStructure(['token', 'user' => ['name', 'roles']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'employee@test.com',
            'password'   => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_fails_with_unknown_user(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'identifier' => 'nobody@test.com',
            'password'   => 'password',
        ]);

        $response->assertStatus(401);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $loginResponse = $this->postJson('/api/auth/login', [
            'identifier' => 'manager@test.com',
            'password'   => 'password',
        ]);

        $token = $loginResponse->json('token');

        $response = $this->withToken($token)->getJson('/api/auth/me');

        $response->assertOk()
                 ->assertJsonPath('roles.0', 'manager');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_logout_succeeds_and_returns_message(): void
    {
        $token = $this->postJson('/api/auth/login', [
            'identifier' => 'employee@test.com',
            'password'   => 'password',
        ])->json('token');

        $this->withToken($token)
             ->postJson('/api/auth/logout')
             ->assertOk()
             ->assertJsonStructure(['message']);
    }

    public function test_all_roles_can_login(): void
    {
        $accounts = [
            'employee@test.com',
            'manager@test.com',
            'security@test.com',
            'doctor@test.com',
            'internal.pharmacy@test.com',
            'medical.admin@test.com',
            'admin@test.com',
        ];

        foreach ($accounts as $email) {
            $this->postJson('/api/auth/login', [
                'identifier' => $email,
                'password'   => 'password',
            ])->assertOk($email . ' failed login');
        }
    }
}
