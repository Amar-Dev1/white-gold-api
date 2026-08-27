import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './jawhara-expenses.service';

const router = Router();
router.use(requireAuth, requireDomain('AL_JAWHARA'));

router.get('/', async (req, res) => {
  const category = req.query.category as string | undefined;

  const expenses = await service.listJawharaExpenses(category);
  res.json(expenses);
});

// POST /api/jw/expenses
router.post('/', async (req, res) => {
  const result = service.jawharaExpenseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات المنصرف غير مكتملة', details: result.error.format() });
    return;
  }

  const expense = await service.createJawharaExpense(result.data);
  res.status(201).json(expense);
});

// PUT /api/jw/expenses/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.jawharaExpenseSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  const updated = await service.updateJawharaExpense(id, result.data);
  res.json(updated);
});

// DELETE /api/jw/expenses/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteJawharaExpense(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
