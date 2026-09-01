import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as service from './customers.service';

const router = Router();
router.use(requireAuth);

// GET /api/customers?domain=WHITE_GOLD
router.get('/', async (req, res) => {
  const domain = req.query.domain as 'WHITE_GOLD' | 'AL_JAWHARA' | undefined;

  if (!domain) {
    res.status(400).json({ error: 'domain مطلوب' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(domain)) {
    res.status(403).json({ error: 'غير مصرح بالوصول لهذا المجال' });
    return;
  }

  const customers = await service.listCustomers(domain);
  res.json(customers);
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const customer = await service.getCustomerById(id);
  if (!customer) {
    res.status(404).json({ error: 'العميل غير موجود' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(customer.domain as any)) {
    res.status(403).json({ error: 'غير مصرح بالوصول لهذا المجال' });
    return;
  }

  res.json(customer);
});

// POST /api/customers
router.post('/', async (req, res) => {
  const result = service.customerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات العميل غير مكتملة', details: result.error.format() });
    return;
  }

  const { domain } = result.data;
  if (req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(domain)) {
    res.status(403).json({ error: 'غير مصرح بالإضافة لهذا المجال' });
    return;
  }

  const customer = await service.createCustomer(result.data);
  res.status(201).json(customer);
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.customerSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  const updated = await service.updateCustomer(id, result.data);
  res.json(updated);
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteCustomer(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

// ==========================================
// Contracts Endpoints
// ==========================================

// POST /api/customers/contracts
router.post('/contracts/new', async (req, res) => {
  const result = service.customerContractSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات العقد / الاتفاقية غير مكتملة', details: result.error.format() });
    return;
  }

  try {
    const contract = await service.createContract(result.data);
    res.status(201).json(contract);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل إنشاء العقد' });
  }
});

// PUT /api/customers/contracts/:id
router.put('/contracts/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.customerContractSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  try {
    const updated = await service.updateContract(id, result.data);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل تحديث العقد' });
  }
});

// DELETE /api/customers/contracts/:id
router.delete('/contracts/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  try {
    await service.deleteContract(id);
    res.json({ message: 'تم حذف العقد بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حذف العقد' });
  }
});

// ==========================================
// Transactions Endpoints
// ==========================================

// POST /api/customers/transactions
router.post('/transactions/new', async (req, res) => {
  const result = service.customerTransactionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات المعاملة غير صحيحة', details: result.error.format() });
    return;
  }

  try {
    const transaction = await service.createTransaction(result.data);
    res.status(201).json(transaction);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل تسجيل المعاملة' });
  }
});

// PUT /api/customers/transactions/:id
router.put('/transactions/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.customerTransactionSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  try {
    const updated = await service.updateTransaction(id, result.data);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل تحديث المعاملة' });
  }
});

// DELETE /api/customers/transactions/:id
router.delete('/transactions/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  try {
    await service.deleteTransaction(id);
    res.json({ message: 'تم حذف المعاملة بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حذف المعاملة' });
  }
});

export default router;
