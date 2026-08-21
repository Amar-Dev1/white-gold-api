import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Workers Module', () => {
  let serverInstance: any;
  let baseUrl: string;
  let wgToken: string;
  let seasonId: number;

  beforeAll(async () => {
    const res = await startTestServer();
    serverInstance = res.server;
    baseUrl = res.baseUrl;

    // Login WG user
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wg_user', password: 'pass123' }),
    });
    wgToken = (await login.json()).token;

    // Get season
    const seasonsRes = await fetch(`${baseUrl}/seasons?domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    const seasons = await seasonsRes.json();
    seasonId = seasons[0].id;
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('Workers - CRUD operations', async () => {
    // 1. Create Worker
    const createRes = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({
        domain: 'WHITE_GOLD',
        seasonId,
        name: 'العامل إبراهيم حسن',
        phone: '0988888888',
        dailyWage: 15000,
        notes: 'عامل تفريغ وشحن',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe('العامل إبراهيم حسن');

    // 2. List Workers
    const listRes = await fetch(`${baseUrl}/workers?domain=WHITE_GOLD&seasonId=${seasonId}`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Edit
    const editRes = await fetch(`${baseUrl}/workers/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({ dailyWage: 18000 }),
    });
    expect(editRes.status).toBe(200);
    const updated = await editRes.json();
    expect(updated.dailyWage).toBe(18000);

    // 4. Delete
    const delRes = await fetch(`${baseUrl}/workers/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
