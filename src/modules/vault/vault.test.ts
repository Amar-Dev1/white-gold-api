import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Vault Module', () => {
  let serverInstance: any;
  let baseUrl: string;
  let adminToken: string;
  let employeeToken: string;
  let seasonId: number;

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

    // Get season ID
    const seasonRes = await fetch(`${baseUrl}/seasons?domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const seasons = await seasonRes.json();
    seasonId = seasons[0].id;
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('GET /api/vault - admin can get vault summary', async () => {
    const res = await fetch(`${baseUrl}/vault?seasonId=${seasonId}&domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vaultConstant).toBeDefined();
    expect(data.availableBalance).toBeDefined();
    expect(data.creditTotal).toBeDefined();
    expect(data.debitTotal).toBeDefined();
  });

  test('GET /api/vault - employee is blocked (403)', async () => {
    const res = await fetch(`${baseUrl}/vault?seasonId=${seasonId}&domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status).toBe(403);
  });

  test('PATCH /api/vault/:id - admin can update initial capital', async () => {
    // 1. Get vault
    const getRes = await fetch(`${baseUrl}/vault?seasonId=${seasonId}&domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const vaultData = await getRes.json();

    // 2. Update initial capital
    const updateRes = await fetch(`${baseUrl}/vault/${vaultData.vaultId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ initialCapital: 75000000 }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.initialCapital).toBe(75000000);
  });
});
