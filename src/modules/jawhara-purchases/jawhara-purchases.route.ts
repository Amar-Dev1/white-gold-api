import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './jawhara-purchases.service';

const router = Router();
router.use(requireAuth, requireDomain('AL_JAWHARA'));

router.get('/', async (req, res) => {
  const category = req.query.category as string | undefined;

  const purchases = await service.listJawharaPurchases(category);
  res.json(purchases);
});

// POST /api/jw/purchases
router.post('/', async (req, res) => {
  const result = service.jawharaPurchaseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات مشتريات الجوهرة غير مكتملة', details: result.error.format() });
    return;
  }

  const purchase = await service.createJawharaPurchase(result.data);
  res.status(201).json(purchase);
});

// PUT /api/jw/purchases/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.jawharaPurchaseSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  const updated = await service.updateJawharaPurchase(id, result.data);
  res.json(updated);
});

// DELETE /api/jw/purchases/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteJawharaPurchase(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
