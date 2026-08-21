import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Jawhara Stock Module', () => {
  let serverInstance: any;
  let baseUrl: string;
  let jwToken: string;

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

  test('Stock Items & Movements - Full lifecycle', async () => {
    // 1. Create Stock Item
    const createRes = await fetch(`${baseUrl}/jw/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        category: 'FEED',
        itemName: 'أمباز بذرة ممتاز',
        currentQuantity: 100,
        unit: 'طن',
      }),
    });
    expect(createRes.status).toBe(201);
    const item = await createRes.json();
    expect(item.currentQuantity).toBe(100);

    // 2. Record IN Movement (+50)
    const inRes = await fetch(`${baseUrl}/jw/stock/${item.id}/movement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        date: '2026-08-20',
        movementType: 'IN',
        quantity: 50,
        notes: 'إضافة توريد وردية',
      }),
    });
    expect(inRes.status).toBe(201);
    const inData = await inRes.json();
    expect(inData.stock.currentQuantity).toBe(150);

    // 3. Record OUT Movement (-30)
    const outRes = await fetch(`${baseUrl}/jw/stock/${item.id}/movement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        date: '2026-08-20',
        movementType: 'OUT',
        quantity: 30,
        notes: 'صرف مبيعات عميل',
      }),
    });
    expect(outRes.status).toBe(201);
    const outData = await outRes.json();
    expect(outData.stock.currentQuantity).toBe(120);

    // 4. Get movement history
    const movRes = await fetch(`${baseUrl}/jw/stock/${item.id}/movements`, {
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(movRes.status).toBe(200);
    const movements = await movRes.json();
    expect(movements.length).toBe(2);

    // 5. Delete item
    const delRes = await fetch(`${baseUrl}/jw/stock/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
