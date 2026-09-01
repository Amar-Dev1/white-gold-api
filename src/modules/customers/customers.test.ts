import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Customers Module', () => {
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

  test('Customers - CRUD operations', async () => {
    // 1. Create Customer
    const createRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        domain: 'AL_JAWHARA',
        name: 'مزارع النيل السعيد',
        phone: '0912345678',
        address: 'الجزيرة - المناقل',
        notes: 'عميل أعلاف دائم',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe('مزارع النيل السعيد');

    // 2. List Customers
    const listRes = await fetch(`${baseUrl}/customers?domain=AL_JAWHARA`, {
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(listRes.status).toBe(200);
    const customers = await listRes.json();
    expect(customers.length).toBeGreaterThan(0);

    // 3. Edit Customer
    const editRes = await fetch(`${baseUrl}/customers/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({ phone: '0999999999' }),
    });
    expect(editRes.status).toBe(200);
    const updated = await editRes.json();
    expect(updated.phone).toBe('0999999999');

    // 4. Create Contract (Agreement: 500 oil gallons @ 100,000 = 50,000,000 SDG)
    const contractRes = await fetch(`${baseUrl}/customers/contracts/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        customerId: created.id,
        productType: 'OIL',
        agreedQuantity: 500,
        unitPrice: 100000,
        totalAgreedPrice: 50000000,
        unit: 'جالون',
        notes: 'عقد توريد زيت نقي',
      }),
    });
    expect(contractRes.status).toBe(201);
    const contract = await contractRes.json();
    expect(contract.agreedQuantity).toBe(500);

    // 5. Test Over-withdrawal Rejection (Attempting 700 gallons on 500 gallon agreement)
    const overTxRes = await fetch(`${baseUrl}/customers/transactions/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        contractId: contract.id,
        date: new Date().toISOString(),
        takenQuantity: 700,
        amountPaid: 70000000,
        notes: 'سحب يتجاوز العقد بالكامل',
      }),
    });
    expect(overTxRes.status).toBe(400);
    const overErr = await overTxRes.json();
    expect(overErr.error).toContain('تتجاوز الكمية المتبقية المتاحة');

    // 6. Valid First Withdrawal: 200 gallons
    const tx1Res = await fetch(`${baseUrl}/customers/transactions/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        contractId: contract.id,
        date: new Date().toISOString(),
        takenQuantity: 200,
        amountPaid: 20000000,
        notes: 'الدفعة الأولى (200 جالون)',
      }),
    });
    expect(tx1Res.status).toBe(201);

    // 7. Test Second Over-withdrawal (Attempting 350 when only 300 remains)
    const overTx2Res = await fetch(`${baseUrl}/customers/transactions/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        contractId: contract.id,
        date: new Date().toISOString(),
        takenQuantity: 350,
        amountPaid: 35000000,
      }),
    });
    expect(overTx2Res.status).toBe(400);

    // 8. Valid Second Withdrawal (Remaining 300 gallons)
    const tx2Res = await fetch(`${baseUrl}/customers/transactions/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        contractId: contract.id,
        date: new Date().toISOString(),
        takenQuantity: 300,
        amountPaid: 30000000,
        notes: 'الدفعة الثانية الختامية (300 جالون)',
      }),
    });
    expect(tx2Res.status).toBe(201);

    // 9. Test Withdrawal on Completed Contract (Attempting 1 gallon when remaining is 0)
    const completedTxRes = await fetch(`${baseUrl}/customers/transactions/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwToken}`,
      },
      body: JSON.stringify({
        contractId: contract.id,
        date: new Date().toISOString(),
        takenQuantity: 1,
        amountPaid: 100000,
      }),
    });
    expect(completedTxRes.status).toBe(400);
    const completedErr = await completedTxRes.json();
    expect(completedErr.error).toContain('مكتملة الاستلام بالكامل');

    // 10. Get Customer Details with Summary and Verification
    const detailRes = await fetch(`${baseUrl}/customers/${created.id}`, {
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.contracts.length).toBe(1);
    const c = detail.contracts[0];
    expect(c.totalTakenQuantity).toBe(500); // 200 + 300 = 500
    expect(c.remainingQuantity).toBe(0); // Fully completed
    expect(c.remainingPrice).toBe(0);
    expect(c.isCompleted).toBe(true);
    expect(c.transactions.length).toBe(2);

    // 11. Delete Customer
    const delRes = await fetch(`${baseUrl}/customers/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
