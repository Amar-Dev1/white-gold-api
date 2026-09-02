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
        date: '2026-08-20',
        sacksCount: 150,
        weightTornata: 6750,
        price: 45000,
        truckPlateNumber: 'أ ب ج 1234',
        customerName: 'المزارع أحمد علي',
      }),
    });
    expect(createRes.status).toBe(201);
    const created: any = await createRes.json();
    expect(created.id).toBeDefined();
    expect(created.sacksCount).toBe(150);
    expect(created.tierKilo).toBe(150 * 1.335);
    expect(created.weightQuntar).toBeCloseTo(((6750 - (150 * 1.335)) * 2.205) / 315, 2);

    // 2. List
    const listRes = await fetch(`${baseUrl}/wg/purchases/cotton`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const items: any = await listRes.json();
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
    const updated: any = await editRes.json();
    expect(updated.sacksCount).toBe(160);
    expect(updated.tierKilo).toBe(160 * 1.335);

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
    const listRes = await fetch(`${baseUrl}/wg/purchases/packaging`, {
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
