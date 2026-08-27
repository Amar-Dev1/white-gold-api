import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './jawhara-sales.service';

const router = Router();
router.use(requireAuth, requireDomain('AL_JAWHARA'));

router.get('/', async (req, res) => {
  const category = req.query.category as string | undefined;

  const sales = await service.listJawharaSales(category);
  res.json(sales);
});

// POST /api/jw/sales
router.post('/', async (req, res) => {
  const result = service.jawharaSaleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات مبيعات الجوهرة غير مكتملة', details: result.error.format() });
    return;
  }

  try {
    const sale = await service.createJawharaSale(result.data);
    res.status(201).json(sale);
  } catch (error: any) {
    if (error.message && error.message.startsWith('INSUFFICIENT_STOCK')) {
      const msg = error.message.replace('INSUFFICIENT_STOCK:', '');
      res.status(400).json({ error: msg });
      return;
    }
    res.status(500).json({ error: 'فشل إتمام عملية البيع' });
  }
});

// PUT /api/jw/sales/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.jawharaSaleSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  try {
    const updated = await service.updateJawharaSale(id, result.data);
    res.json(updated);
  } catch (error: any) {
    if (error.message && error.message.startsWith('INSUFFICIENT_STOCK')) {
      const msg = error.message.replace('INSUFFICIENT_STOCK:', '');
      res.status(400).json({ error: msg });
      return;
    }
    res.status(500).json({ error: 'فشل تعديل عملية البيع' });
  }
});

// DELETE /api/jw/sales/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteJawharaSale(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
