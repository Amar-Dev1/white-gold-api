import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Employees Module', () => {
  let serverInstance: any;
  let baseUrl: string;
  let wgToken: string;

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

  test('Employees - CRUD operations', async () => {
    // 1. Create Employee
    const createRes = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({
        domain: 'WHITE_GOLD',
        name: 'المهندس عثمان خالد',
        phone: '0912121212',
        jobTitle: 'مدير المحلج الفني',
        salary: 850000,
        startDate: '2026-01-01',
        isActive: true,
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.name).toBe('المهندس عثمان خالد');

    // 2. List Employees
    const listRes = await fetch(`${baseUrl}/employees?domain=WHITE_GOLD`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const items = await listRes.json();
    expect(items.length).toBeGreaterThan(0);

    // 3. Edit
    const editRes = await fetch(`${baseUrl}/employees/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({ salary: 900000 }),
    });
    expect(editRes.status).toBe(200);
    const updated = await editRes.json();
    expect(updated.salary).toBe(900000);

    // 4. Delete
    const delRes = await fetch(`${baseUrl}/employees/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
