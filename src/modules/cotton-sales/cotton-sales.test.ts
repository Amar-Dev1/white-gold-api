import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('WhiteGold Sales Module', () => {
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

    // Get active season
    const seasonsRes = await fetch(`${baseUrl}/seasons?domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    const seasons = await seasonsRes.json();
    seasonId = seasons[0].id;
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('Cotton Sales - CRUD operations', async () => {
    // 1. Create
    const createRes = await fetch(`${baseUrl}/wg/sales/cotton`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({
        seasonId,
        date: '2026-08-20',
        quantity: 80,
        weightKg: 18000,
        pricePerUnit: 180000,
        totalAmount: 14400000,
        lotNumber: 'LOT-2026-001',
        customerName: 'شركة النسيج السودانية',
        destination: 'الخرطوم بحري',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeDefined();
    expect(created.lotNumber).toBe('LOT-2026-001');

    // 2. List
    const listRes = await fetch(`${baseUrl}/wg/sales/cotton?seasonId=${seasonId}`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Edit
    const editRes = await fetch(`${baseUrl}/wg/sales/cotton/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({ quantity: 85 }),
    });
    expect(editRes.status).toBe(200);
    const updated = await editRes.json();
    expect(updated.quantity).toBe(85);

    // 4. Delete
    const delRes = await fetch(`${baseUrl}/wg/sales/cotton/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(delRes.status).toBe(200);
  });

  test('Waste Sales - CRUD operations', async () => {
    // 1. Create
    const createRes = await fetch(`${baseUrl}/wg/sales/waste`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({
        seasonId,
        date: '2026-08-20',
        quantity: 25,
        weightKg: 2500,
        pricePerUnit: 45000,
        totalAmount: 1125000,
        type: 'مخلفات حلج وقشور',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    // 2. List
    const listRes = await fetch(`${baseUrl}/wg/sales/waste?seasonId=${seasonId}`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Delete
    const delRes = await fetch(`${baseUrl}/wg/sales/waste/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
