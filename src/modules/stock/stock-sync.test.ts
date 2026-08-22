import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';
import { prisma } from '../../lib/prisma';

describe('Al-Jawhara Live Stock Synchronization & Availability Verification', () => {
  let serverInstance: any;
  let baseUrl: string;
  let adminToken: string;
  let seasonId: number;

  beforeAll(async () => {
    const res = await startTestServer();
    serverInstance = res.server;
    baseUrl = res.baseUrl;

    // Login admin
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    adminToken = (await login.json()).token;

    // Get season ID
    const seasonRes = await fetch(`${baseUrl}/seasons?domain=AL_JAWHARA`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const seasons = await seasonRes.json();
    seasonId = seasons[0].id;

    // Clean test stock items and movements
    await prisma.stockMovement.deleteMany({});
    await prisma.stock.deleteMany({});
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('Creating Jawhara Purchase automatically increases stock (IN)', async () => {
    const purchaseRes = await fetch(`${baseUrl}/jw/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        seasonId,
        category: 'RAW',
        date: '2026-02-01',
        sacksCount: 500,
        weightKg: 25000,
        pricePerSack: 50000,
        totalAmount: 25000000,
        truckPlateNumber: 'أ ب 1234',
        customerName: 'شركة البذور المتحدة',
      }),
    });

    expect(purchaseRes.status).toBe(201);

    // Verify Stock quantity increased by 500
    const stockItemsRes = await fetch(`${baseUrl}/jw/stock?category=FEED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stockItems = await stockItemsRes.json();
    expect(stockItems.length).toBeGreaterThan(0);
    const feedStock = stockItems[0];
    expect(feedStock.currentQuantity).toBe(500);

    // Verify Stock movement log exists
    const movementsRes = await fetch(`${baseUrl}/jw/stock/${feedStock.id}/movements`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const movements = await movementsRes.json();
    expect(movements.length).toBe(1);
    expect(movements[0].movementType).toBe('IN');
    expect(movements[0].quantity).toBe(500);
  });

  test('Sale fails with 400 Bad Request when stock quantity is insufficient', async () => {
    // Attempt to sell 1,000 units of FEED when only 500 units exist in stock
    const saleRes = await fetch(`${baseUrl}/jw/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        seasonId,
        category: 'FEED',
        date: '2026-02-02',
        quantity: 1000,
        weightKg: 50000,
        pricePerUnit: 60000,
        totalAmount: 60000000,
        customerName: 'مزرعة الهدى',
      }),
    });

    expect(saleRes.status).toBe(400);
    const errData = await saleRes.json();
    expect(errData.error).toContain('المخزون المتاح غير كافٍ');
  });

  test('Successful sale decreases stock quantity (OUT) and records movement', async () => {
    // Sell 200 units (valid since 500 exist)
    const saleRes = await fetch(`${baseUrl}/jw/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        seasonId,
        category: 'FEED',
        date: '2026-02-03',
        quantity: 200,
        weightKg: 10000,
        pricePerUnit: 60000,
        totalAmount: 12000000,
        customerName: 'مزرعة الهدى',
      }),
    });

    expect(saleRes.status).toBe(201);
    const sale = await saleRes.json();

    // Verify stock decreased from 500 to 300
    const stockItemsRes = await fetch(`${baseUrl}/jw/stock?category=FEED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stockItems = await stockItemsRes.json();
    const feedStock = stockItems[0];
    expect(feedStock.currentQuantity).toBe(300);

    // Delete sale and verify stock is reverted back to 500
    const deleteRes = await fetch(`${baseUrl}/jw/sales/${sale.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteRes.status).toBe(200);

    const revertedStockRes = await fetch(`${baseUrl}/jw/stock?category=FEED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const revertedItems = await revertedStockRes.json();
    expect(revertedItems[0].currentQuantity).toBe(500);
  });
});
