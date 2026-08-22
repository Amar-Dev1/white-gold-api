import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

// Module Route Imports
import authRoutes from '../modules/auth/auth.route';
import seasonsRoutes from '../modules/seasons/seasons.route';
import vaultRoutes from '../modules/vault/vault.route';
import usersRoutes from '../modules/users/users.route';
import wgPurchasesRoutes from '../modules/cotton-purchases/cotton-purchases.route';
import wgSalesRoutes from '../modules/cotton-sales/cotton-sales.route';
import wgReportsRoutes from '../modules/ginning-reports/ginning-reports.route';
import jwPurchasesRoutes from '../modules/jawhara-purchases/jawhara-purchases.route';
import jwSalesRoutes from '../modules/jawhara-sales/jawhara-sales.route';
import jwExpensesRoutes from '../modules/jawhara-expenses/jawhara-expenses.route';
import jwStockRoutes from '../modules/stock/stock.route';
import jwCustomersRoutes from '../modules/customers/customers.route';
import employeesRoutes from '../modules/employees/employees.route';
import workersRoutes from '../modules/workers/workers.route';

export function createTestApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/seasons', seasonsRoutes);
  app.use('/api/vault', vaultRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/wg/purchases', wgPurchasesRoutes);
  app.use('/api/wg/sales', wgSalesRoutes);
  app.use('/api/wg/reports', wgReportsRoutes);
  app.use('/api/jw/purchases', jwPurchasesRoutes);
  app.use('/api/jw/sales', jwSalesRoutes);
  app.use('/api/jw/expenses', jwExpensesRoutes);
  app.use('/api/jw/stock', jwStockRoutes);
  app.use('/api/customers', jwCustomersRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/workers', workersRoutes);

  return app;
}

const ADMIN_HASH = bcrypt.hashSync('admin123', 10);
const PASS_HASH = bcrypt.hashSync('pass123', 10);

export async function ensureTestUsers() {
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: ADMIN_HASH, role: 'ADMIN' },
    create: {
      username: 'admin',
      passwordHash: ADMIN_HASH,
      role: 'ADMIN',
      domainAccess: { create: [{ domain: 'WHITE_GOLD' }, { domain: 'AL_JAWHARA' }] },
    },
  });

  await prisma.user.upsert({
    where: { username: 'wg_user' },
    update: { passwordHash: PASS_HASH, role: 'EMPLOYEE' },
    create: {
      username: 'wg_user',
      passwordHash: PASS_HASH,
      role: 'EMPLOYEE',
      domainAccess: { create: [{ domain: 'WHITE_GOLD' }] },
    },
  });

  await prisma.user.upsert({
    where: { username: 'jw_user' },
    update: { passwordHash: PASS_HASH, role: 'EMPLOYEE' },
    create: {
      username: 'jw_user',
      passwordHash: PASS_HASH,
      role: 'EMPLOYEE',
      domainAccess: { create: [{ domain: 'AL_JAWHARA' }] },
    },
  });

  // Ensure active season exists for both domains in tests
  const wgSeason = await prisma.season.findFirst({ where: { domain: 'WHITE_GOLD', isActive: true } });
  if (!wgSeason) {
    await prisma.season.create({
      data: {
        name: 'موسم 2026 الحالي',
        domain: 'WHITE_GOLD',
        startDate: new Date('2026-01-01'),
        isActive: true,
        vaults: { create: { domain: 'WHITE_GOLD', initialCapital: 0 } },
      },
    });
  }

  const jwSeason = await prisma.season.findFirst({ where: { domain: 'AL_JAWHARA', isActive: true } });
  if (!jwSeason) {
    await prisma.season.create({
      data: {
        name: 'موسم 2026 الحالي',
        domain: 'AL_JAWHARA',
        startDate: new Date('2026-01-01'),
        isActive: true,
        vaults: { create: { domain: 'AL_JAWHARA', initialCapital: 0 } },
      },
    });
  }
}

export async function startTestServer() {
  await ensureTestUsers();
  const app = createTestApp();
  return new Promise<{ server: any; baseUrl: string }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as { port: number };
      resolve({ server, baseUrl: `http://localhost:${address.port}/api` });
    });
  });
}
