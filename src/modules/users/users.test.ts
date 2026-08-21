import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Users Management Module (Admin Only)', () => {
  let serverInstance: any;
  let baseUrl: string;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    const res = await startTestServer();
    serverInstance = res.server;
    baseUrl = res.baseUrl;

    // Login admin
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    adminToken = (await adminLogin.json()).token;

    // Login employee
    const empLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wg_user', password: 'pass123' }),
    });
    employeeToken = (await empLogin.json()).token;
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('GET /api/users - admin can list users', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  test('GET /api/users - regular employee blocked (403)', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status).toBe(403);
  });

  test('POST /api/users - admin can create user with specific domain permissions', async () => {
    const createRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'test_accountant',
        password: 'accountant123',
        role: 'EMPLOYEE',
        domains: ['AL_JAWHARA'],
      }),
    });
    expect(createRes.status).toBe(201);
    const newUser = await createRes.json();
    expect(newUser.username).toBe('test_accountant');
    expect(newUser.allowedDomains).toEqual(['AL_JAWHARA']);

    // Verify created user can login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_accountant', password: 'accountant123' }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.user.allowedDomains).toEqual(['AL_JAWHARA']);
  });

  test('PUT /api/users/:id - admin can update user permissions', async () => {
    // 1. Fetch user list
    const listRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = await listRes.json();
    const targetUser = users.find((u: any) => u.username === 'test_accountant');

    // 2. Grant access to both domains
    const updateRes = await fetch(`${baseUrl}/users/${targetUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        domains: ['WHITE_GOLD', 'AL_JAWHARA'],
        role: 'ADMIN',
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.role).toBe('ADMIN');
    expect(updated.allowedDomains).toContain('WHITE_GOLD');
    expect(updated.allowedDomains).toContain('AL_JAWHARA');
  });

  test('DELETE /api/users/:id - admin can delete user', async () => {
    const listRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = await listRes.json();
    const targetUser = users.find((u: any) => u.username === 'test_accountant');

    const delRes = await fetch(`${baseUrl}/users/${targetUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
