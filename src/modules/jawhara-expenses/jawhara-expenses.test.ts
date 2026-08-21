import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Jawhara Expenses Module', () => {
  let serverInstance: any;
  let baseUrl: string;
  let jwToken: string;
  let seasonId: number;

  beforeAll(async () => {
    const res = await startTestServer();
    serverInstance = res.server;
    baseUrl = res.baseUrl;

    // Login JW user
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jw_user', password: 'pass123' }),
    });
    jwToken = (await login.json()).token;

    // Get active season
    const seasonsRes = await fetch(`${baseUrl}/seasons?domain=AL_JAWHARA`, {
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    const seasons = await seasonsRes.json();
    seasonId = seasons[0].id;
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('Jawhara Expenses - CRUD operations', async () => {
    // 1. Create Expense
    const createRes = await fetch(`${baseUrl}/jw/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        seasonId,
        category: 'OPERATIONS',
        date: '2026-08-20',
        description: 'صيانة وقود المولدات',
        amount: 450000,
        notes: 'تمت الصيانة الفنية',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.amount).toBe(450000);

    // 2. List Expenses
    const listRes = await fetch(`${baseUrl}/jw/expenses?seasonId=${seasonId}&category=OPERATIONS`, {
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Delete
    const delRes = await fetch(`${baseUrl}/jw/expenses/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
