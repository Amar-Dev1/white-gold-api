import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

// Module Routes
import authRoutes from './src/modules/auth/auth.route';
import vaultRoutes from './src/modules/vault/vault.route';
import usersRoutes from './src/modules/users/users.route';
import statisticsRoutes from './src/modules/statistics/statistics.route';
import wgPurchasesRoutes from './src/modules/cotton-purchases/cotton-purchases.route';
import wgSalesRoutes from './src/modules/cotton-sales/cotton-sales.route';
import wgReportsRoutes from './src/modules/ginning-reports/ginning-reports.route';
import jwPurchasesRoutes from './src/modules/jawhara-purchases/jawhara-purchases.route';
import jwSalesRoutes from './src/modules/jawhara-sales/jawhara-sales.route';
import jwExpensesRoutes from './src/modules/jawhara-expenses/jawhara-expenses.route';
import jwStockRoutes from './src/modules/stock/stock.route';
import jwCustomersRoutes from './src/modules/customers/customers.route';
import employeesRoutes from './src/modules/employees/employees.route';
import workersRoutes from './src/modules/workers/workers.route';
import uploadsRoutes from './src/modules/uploads/uploads.route';
import { UPLOAD_DIR } from './src/lib/upload';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Static uploads serving
app.use('/uploads', express.static(UPLOAD_DIR));

// API Router Mounting
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/statistics', statisticsRoutes);
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
app.use('/api/uploads', uploadsRoutes);

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', service: 'WhiteGold ERP Backend API', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({ error: 'حجم الصورة أو الملف المرفوع كبير جداً (الحد الأقصى المسموح به هو 50 ميغابايت).' });
    return;
  }
  if (err.message === 'INVALID_FILE_TYPE') {
    res.status(400).json({ error: 'نوع الملف غير مدعوم. يرجى رفع صورة بصيغة (JPG, PNG, WEBP) أو ملف PDF.' });
    return;
  }
  console.error('Server error:', err);
  res.status(500).json({ error: 'حدث خطأ في الخادم أثناء معالجة الطلب.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 WhiteGold ERP Backend server running on http://localhost:${PORT}`);
  });
}

export default app;