import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

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

export async function startTestServer() {
  const app = createTestApp();
  return new Promise<{ server: any; baseUrl: string }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as { port: number };
      resolve({ server, baseUrl: `http://localhost:${address.port}/api` });
    });
  });
}
