import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as service from './employees.service';

const router = Router();
router.use(requireAuth);

// GET /api/employees?domain=WHITE_GOLD (domain is optional)
router.get('/', async (req, res) => {
  const domain = req.query.domain as 'WHITE_GOLD' | 'AL_JAWHARA' | undefined;

  if (domain && req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(domain)) {
    res.status(403).json({ error: 'غير مصرح بالوصول لهذا المجال' });
    return;
  }

  const employees = await service.listEmployees(domain);
  res.json(employees);
});

// POST /api/employees
router.post('/', async (req, res) => {
  const result = service.employeeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات الموظف غير مكتملة', details: result.error.format() });
    return;
  }

  const { domain } = result.data;
  if (req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(domain)) {
    res.status(403).json({ error: 'غير مصرح بالإضافة لهذا المجال' });
    return;
  }

  const employee = await service.createEmployee(result.data);
  res.status(201).json(employee);
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.employeeSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  const updated = await service.updateEmployee(id, result.data);
  res.json(updated);
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteEmployee(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
