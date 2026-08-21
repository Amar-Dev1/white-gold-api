import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('WhiteGold Purchases Module', () => {
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

  test('Cotton Purchases - CRUD operations', async () => {
    // 1. Create
    const createRes = await fetch(`${baseUrl}/wg/purchases/cotton`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({
        seasonId,
        date: '2026-08-20',
        sacksCount: 150,
        weightKg: 6750,
        pricePerSack: 45000,
        totalAmount: 6750000,
        truckPlateNumber: 'أ ب ج 1234',
        customerName: 'المزارع أحمد علي',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeDefined();
    expect(created.sacksCount).toBe(150);

    // 2. List
    const listRes = await fetch(`${baseUrl}/wg/purchases/cotton?seasonId=${seasonId}`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Edit
    const editRes = await fetch(`${baseUrl}/wg/purchases/cotton/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({ sacksCount: 160 }),
    });
    expect(editRes.status).toBe(200);
    const updated = await editRes.json();
    expect(updated.sacksCount).toBe(160);

    // 4. Delete
    const delRes = await fetch(`${baseUrl}/wg/purchases/cotton/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(delRes.status).toBe(200);
  });

  test('Packaging Purchases - CRUD operations', async () => {
    // 1. Create
    const createRes = await fetch(`${baseUrl}/wg/purchases/packaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({
        seasonId,
        date: '2026-08-20',
        quantity: 500,
        price: 3500,
        totalCost: 1750000,
        type: 'شوالات خيش مقواة',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    // 2. List
    const listRes = await fetch(`${baseUrl}/wg/purchases/packaging?seasonId=${seasonId}`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Delete
    const delRes = await fetch(`${baseUrl}/wg/purchases/packaging/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
