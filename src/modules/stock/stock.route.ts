import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './stock.service';

const router = Router();
router.use(requireAuth, requireDomain('AL_JAWHARA'));

// GET /api/jw/stock?category=FEED
router.get('/', async (req, res) => {
  const category = req.query.category as string | undefined;
  const items = await service.listStockItems(category);
  res.json(items);
});

// POST /api/jw/stock
router.post('/', async (req, res) => {
  const result = service.stockItemSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات الصنف المخزوني غير مكتملة', details: result.error.format() });
    return;
  }

  const item = await service.createStockItem(result.data);
  res.status(201).json(item);
});

// PUT /api/jw/stock/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.stockItemSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  const updated = await service.updateStockItem(id, result.data);
  res.json(updated);
});

// DELETE /api/jw/stock/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteStockItem(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

// POST /api/jw/stock/:id/movement
router.post('/:id/movement', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.stockMovementSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات حركة المخزون غير صحيحة', details: result.error.format() });
    return;
  }

  try {
    const data = await service.recordStockMovement(id, result.data);
    res.status(201).json(data);
  } catch (error: any) {
    if (error.message === 'STOCK_NOT_FOUND') {
      res.status(404).json({ error: 'الصنف غير موجود' });
      return;
    }
    res.status(500).json({ error: 'فشل تسجيل حركة المخزون' });
  }
});

// GET /api/jw/stock/:id/movements
router.get('/:id/movements', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const movements = await service.listStockMovements(id);
  res.json(movements);
});

export default router;
