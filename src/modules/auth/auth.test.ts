import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('Auth Module', () => {
  let serverInstance: any;
  let baseUrl: string;

  beforeAll(async () => {
    const res = await startTestServer();
    serverInstance = res.server;
    baseUrl = res.baseUrl;
  });

  afterAll(() => {
    serverInstance?.close();
  });

  test('POST /api/auth/login - valid credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.username).toBe('admin');
    expect(data.user.role).toBe('ADMIN');
    expect(data.user.allowedDomains).toContain('WHITE_GOLD');
    expect(data.user.allowedDomains).toContain('AL_JAWHARA');
  });

  test('POST /api/auth/login - invalid password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test('POST /api/auth/login - non-existent user', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent', password: 'password' }),
    });

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me - authenticated user', async () => {
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wg_user', password: 'pass123' }),
    });
    const { token } = await loginRes.json();

    // 2. Fetch /me
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.username).toBe('wg_user');
    expect(meData.user.role).toBe('EMPLOYEE');
    expect(meData.user.allowedDomains).toEqual(['WHITE_GOLD']);
  });

  test('GET /api/auth/me - unauthenticated request', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout - invalidates session', async () => {
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jw_user', password: 'pass123' }),
    });
    const { token } = await loginRes.json();

    // 2. Logout
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.status).toBe(200);

    // 3. Try to use token again
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(401);
  });
});
