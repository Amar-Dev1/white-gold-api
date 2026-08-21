import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Seasons Module', () => {
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

  test('GET /api/seasons - list seasons', async () => {
    const res = await fetch(`${baseUrl}/seasons?domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status).toBe(200);
    const seasons = await res.json();
    expect(Array.isArray(seasons)).toBe(true);
    expect(seasons.length).toBeGreaterThan(0);
  });

  test('POST /api/seasons - admin can create new season', async () => {
    const res = await fetch(`${baseUrl}/seasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'موسم 2027 القادم',
        domain: 'WHITE_GOLD',
        startDate: '2027-01-01',
        initialCapital: 60000000,
      }),
    });
    expect(res.status).toBe(201);
    const season = await res.json();
    expect(season.name).toBe('موسم 2027 القادم');
    expect(season.vaults).toBeDefined();
  });

  test('POST /api/seasons - non-admin blocked', async () => {
    const res = await fetch(`${baseUrl}/seasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        name: 'موسم غير مصرح',
        domain: 'WHITE_GOLD',
        startDate: '2027-01-01',
      }),
    });
    expect(res.status).toBe(403);
  });

  test('PATCH /api/seasons/:id - admin can update season', async () => {
    // 1. Fetch seasons
    const listRes = await fetch(`${baseUrl}/seasons?domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const seasons = await listRes.json();
    const seasonId = seasons[0].id;

    // 2. Update name
    const updateRes = await fetch(`${baseUrl}/seasons/${seasonId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'موسم 2026 المعدل' }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.name).toBe('موسم 2026 المعدل');
  });
});
