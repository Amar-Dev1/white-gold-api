import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';
import { prisma } from '../../lib/prisma';

describe('Vault Module (Strict & Comprehensive)', () => {
  let serverInstance: any;
  let baseUrl: string;
  let adminToken: string;
  let employeeToken: string;
  let seasonId: number;
  let vaultId: number;

  beforeAll(async () => {
    const res = await startTestServer();
    serverInstance = res.server;
    baseUrl = res.baseUrl;

    // Login admin
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    adminToken = (await adminLogin.json()).token;

    // Login employee
    const empLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wg_user', password: 'pass123' }),
    });
    employeeToken = (await empLogin.json()).token;

    // Get season ID
    const seasonRes = await fetch(`${baseUrl}/seasons?domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const seasons = await seasonRes.json();
    seasonId = seasons[0].id;

    // Reset vault initial capital to 0 & delete existing adjustments for clean test isolation
    const v = await prisma.vault.findUnique({
      where: { seasonId_domain: { seasonId, domain: 'WHITE_GOLD' } },
    });
    if (v) {
      vaultId = v.id;
      await prisma.vaultAdjustment.deleteMany({ where: { vaultId: v.id } });
      await prisma.vault.update({ where: { id: v.id }, data: { initialCapital: 0 } });
    }
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('GET /api/vault - admin can get vault summary', async () => {
    const res = await fetch(`${baseUrl}/vault?seasonId=${seasonId}&domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vaultId).toBeDefined();
    expect(data.vaultConstant).toBe(0);
    expect(data.availableBalance).toBeDefined();
    expect(data.creditTotal).toBeDefined();
    expect(data.debitTotal).toBeDefined();
    vaultId = data.vaultId;
  });

  test('GET /api/vault - employee is blocked (403)', async () => {
    const res = await fetch(`${baseUrl}/vault?seasonId=${seasonId}&domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status).toBe(403);
  });

  test('PATCH /api/vault/:id - initial capital set once, then locked (400 on 2nd attempt)', async () => {
    // 1. Set initial capital for first time (should succeed 200)
    const updateRes = await fetch(`${baseUrl}/vault/${vaultId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ initialCapital: 50000000 }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.initialCapital).toBe(50000000);

    // 2. Second attempt to update initial capital (should fail 400 - locked)
    const secondUpdate = await fetch(`${baseUrl}/vault/${vaultId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ initialCapital: 90000000 }),
    });

    expect(secondUpdate.status).toBe(400);
    const errData = await secondUpdate.json();
    expect(errData.error).toContain('تم تحديده مسبقاً');
  });

  test('POST /api/vault/:id/emergency-override - admin can override capital', async () => {
    const res = await fetch(`${baseUrl}/vault/${vaultId}/emergency-override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ initialCapital: 60000000 }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.initialCapital).toBe(60000000);
  });

  test('POST /api/vault/adjustments - admin can create manual credit and debit adjustments', async () => {
    // 1. Create CREDIT adjustment
    const creditRes = await fetch(`${baseUrl}/vault/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        vaultId,
        date: new Date().toISOString().split('T')[0],
        type: 'CREDIT',
        amount: 5000000,
        reason: 'إيداع بنكي مباشر',
        referenceNo: 'REF-101',
      }),
    });
    expect(creditRes.status).toBe(201);
    const creditData = await creditRes.json();
    expect(creditData.id).toBeDefined();
    expect(creditData.amount).toBe(5000000);

    // 2. Create DEBIT adjustment
    const debitRes = await fetch(`${baseUrl}/vault/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        vaultId,
        date: new Date().toISOString().split('T')[0],
        type: 'DEBIT',
        amount: 2000000,
        reason: 'تسوية عجز نقدي',
        referenceNo: 'REF-102',
      }),
    });
    expect(debitRes.status).toBe(201);
    const debitData = await debitRes.json();
    expect(debitData.id).toBeDefined();

    // 3. Verify vault summary recalculation
    const summaryRes = await fetch(`${baseUrl}/vault?seasonId=${seasonId}&domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summary = await summaryRes.json();
    expect(summary.vaultConstant).toBe(60000000);
    // Check that available balance accounts for adjustments
    expect(summary.availableBalance).toBe(60000000 + summary.creditTotal - summary.debitTotal);

    // 4. Verify transactions list includes manual adjustments
    const txnsRes = await fetch(`${baseUrl}/vault/transactions?seasonId=${seasonId}&domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const txns = await txnsRes.json();
    const manualTxn = txns.find((t: any) => t.id === `adj-${creditData.id}`);
    expect(manualTxn).toBeDefined();
    expect(manualTxn.isManualAdjustment).toBe(true);

    // 5. Clean up by deleting the test adjustment
    const deleteRes = await fetch(`${baseUrl}/vault/adjustments/${creditData.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteRes.status).toBe(200);
  });
});
