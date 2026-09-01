import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Jawhara Purchases Module', () => {
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
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('Jawhara Purchases - CRUD operations across categories', async () => {
    // 1. Create RAW Purchase
    const createRes = await fetch(`${baseUrl}/jw/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        category: 'RAW',
        date: '2026-08-20',
        sacksCount: 200,
        weightKg: 9000,
        pricePerSack: 25000,
        totalAmount: 5000000,
        truckPlateNumber: 'خ 4567',
        driverName: 'عثمان إبراهيم',
        driverPhone: '0912345678',
        customerName: 'مورد القطن علي',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.category).toBe('RAW');
    expect(created.driverName).toBe('عثمان إبراهيم');

    // 2. List RAW Purchases
    const listRes = await fetch(`${baseUrl}/jw/purchases?category=RAW`, {
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Edit
    const editRes = await fetch(`${baseUrl}/jw/purchases/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({ sacksCount: 220 }),
    });
    expect(editRes.status).toBe(200);

    // 4. Delete
    const delRes = await fetch(`${baseUrl}/jw/purchases/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
