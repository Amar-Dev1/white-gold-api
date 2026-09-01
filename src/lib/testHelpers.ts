import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

// Module Route Imports
import authRoutes from '../modules/auth/auth.route';
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
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: ADMIN_HASH, role: 'ADMIN' },
    create: {
      username: 'admin',
      passwordHash: ADMIN_HASH,
      role: 'ADMIN',
    },
  });
  await prisma.userDomainAccess.upsert({
    where: { userId_domain: { userId: admin.id, domain: 'WHITE_GOLD' } },
    update: {},
    create: { userId: admin.id, domain: 'WHITE_GOLD' },
  });
  await prisma.userDomainAccess.upsert({
    where: { userId_domain: { userId: admin.id, domain: 'AL_JAWHARA' } },
    update: {},
    create: { userId: admin.id, domain: 'AL_JAWHARA' },
  });

  const wgUser = await prisma.user.upsert({
    where: { username: 'wg_user' },
    update: { passwordHash: PASS_HASH, role: 'EMPLOYEE' },
    create: {
      username: 'wg_user',
      passwordHash: PASS_HASH,
      role: 'EMPLOYEE',
    },
  });
  await prisma.userDomainAccess.upsert({
    where: { userId_domain: { userId: wgUser.id, domain: 'WHITE_GOLD' } },
    update: {},
    create: { userId: wgUser.id, domain: 'WHITE_GOLD' },
  });

  const jwUser = await prisma.user.upsert({
    where: { username: 'jw_user' },
    update: { passwordHash: PASS_HASH, role: 'EMPLOYEE' },
    create: {
      username: 'jw_user',
      passwordHash: PASS_HASH,
      role: 'EMPLOYEE',
    },
  });
  await prisma.userDomainAccess.upsert({
    where: { userId_domain: { userId: jwUser.id, domain: 'AL_JAWHARA' } },
    update: {},
    create: { userId: jwUser.id, domain: 'AL_JAWHARA' },
  });

  // Ensure vault exists for both domains in tests
  await prisma.vault.upsert({
    where: { domain: 'WHITE_GOLD' },
    update: {},
    create: { domain: 'WHITE_GOLD', initialCapital: 1000000 },
  });

  await prisma.vault.upsert({
    where: { domain: 'AL_JAWHARA' },
    update: {},
    create: { domain: 'AL_JAWHARA', initialCapital: 1000000 },
  });
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
