import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './jawhara-expenses.service';

const router = Router();
router.use(requireAuth, requireDomain('AL_JAWHARA'));

// GET /api/jw/expenses?seasonId=X&category=OPERATIONS
router.get('/', async (req, res) => {
  const seasonId = parseInt(req.query.seasonId as string || '', 10);
  const category = req.query.category as string | undefined;

  if (isNaN(seasonId)) {
    res.status(400).json({ error: 'seasonId مطلوب' });
    return;
  }

  const expenses = await service.listJawharaExpenses(seasonId, category);
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
