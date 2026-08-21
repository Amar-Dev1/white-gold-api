import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer } from '../../lib/testHelpers';

describe('WhiteGold Ginning Reports Module', () => {
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

  test('Ginning Reports - List, Add via URL, Delete', async () => {
    // 1. Add report via imageUrl
    const addRes = await fetch(`${baseUrl}/wg/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wgToken}`,
      },
      body: JSON.stringify({
        seasonId,
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d',
      }),
    });
    expect(addRes.status).toBe(201);
    const created = await addRes.json();
    expect(created.id).toBeDefined();
    expect(created.imageUrl).toContain('unsplash');

    // 2. List reports
    const listRes = await fetch(`${baseUrl}/wg/reports?seasonId=${seasonId}`, {
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(listRes.status).toBe(200);
    const reports = await listRes.json();
    expect(reports.length).toBeGreaterThan(0);

    // 3. Delete report
    const delRes = await fetch(`${baseUrl}/wg/reports/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wgToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});
