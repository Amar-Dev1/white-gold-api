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

export default router;
