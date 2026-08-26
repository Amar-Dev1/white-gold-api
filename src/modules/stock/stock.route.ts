import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './stock.service';

const router = Router();
router.use(requireAuth, requireDomain('AL_JAWHARA'));

// GET /api/jw/stock?category=FEED
router.get('/', async (req, res) => {
  const category = req.query.category as string | undefined;
  let items = await service.listStockItems(category);

  // If a specific category was requested and no item exists yet, ensure one exists
  if (category && items.length === 0) {
    const defaultNames: Record<string, string> = {
      OIL: 'مخزون زيت البذرة الصافي',
      FEED: 'مخزون أمباز (علف البذرة)',
      WASTE: 'مخزون مخلفات العصر',
      PACKAGING: 'مخزون مستلزمات التعبئة',
    };
    const defaultUnits: Record<string, string> = {
      OIL: 'برميل',
      FEED: 'جوال',
      WASTE: 'طن',
      PACKAGING: 'وحدة',
    };
    const item = await service.ensureStockItemForCategory(
      category,
      defaultNames[category] || `مخزون ${category}`,
      defaultUnits[category] || 'وحدة'
    );
    items = [item];
  }

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

// POST /api/jw/stock/:id/movement AND /api/jw/stock/:id/movements
const handleRecordMovement = async (req: any, res: any) => {
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
};

router.post('/:id/movement', handleRecordMovement);
router.post('/:id/movements', handleRecordMovement);

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
