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

    // 3. Edit
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

    // 4. Delete
    const delRes = await fetch(`${baseUrl}/customers/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
