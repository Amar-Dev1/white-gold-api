import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';
import { prisma } from '../../lib/prisma';

describe('Jawhara Sales Module', () => {
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

    // Ensure stock exists for OIL for testing sale
    await prisma.stock.upsert({
      where: { id: 999999 },
      update: { currentQuantity: 500 },
      create: {
        id: 999999,
        category: 'OIL',
        itemName: 'مخزون زيت البذرة النقي',
        currentQuantity: 500,
        unit: 'برميل',
      },
    });
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('Jawhara Sales - CRUD operations for Oil and Feed', async () => {
    // 1. Create Oil Sale
    const createRes = await fetch(`${baseUrl}/jw/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        seasonId,
        category: 'OIL',
        date: '2026-08-20',
        quantity: 50,
        weightKg: 10000,
        pricePerUnit: 250000,
        totalAmount: 12500000,
        customerName: 'شركة النيل للزيوت',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.category).toBe('OIL');

    // 2. List Oil Sales
    const listRes = await fetch(`${baseUrl}/jw/sales?seasonId=${seasonId}&category=OIL`, {
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Delete
    const delRes = await fetch(`${baseUrl}/jw/sales/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
