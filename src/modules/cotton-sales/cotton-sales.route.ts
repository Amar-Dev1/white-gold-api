import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './cotton-sales.service';

const router = Router();
router.use(requireAuth, requireDomain('WHITE_GOLD'));

// Cotton Sales Routes
router.get('/cotton', async (req, res) => {
  const seasonId = parseInt(req.query.seasonId as string || '', 10);
  if (isNaN(seasonId)) {
    res.status(400).json({ error: 'seasonId مطلوب' });
    return;
  }
  const sales = await service.listCottonSales(seasonId);
  res.json(sales);
});

router.post('/cotton', async (req, res) => {
  const result = service.cottonSaleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات مبيعات القطن غير مكتملة', details: result.error.format() });
    return;
  }
  const sale = await service.createCottonSale(result.data);
  res.status(201).json(sale);
});

router.put('/cotton/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  const result = service.cottonSaleSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }
  const updated = await service.updateCottonSale(id, result.data);
  res.json(updated);
});

router.delete('/cotton/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  await service.deleteCottonSale(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

// Waste Sales Routes
router.get('/waste', async (req, res) => {
  const seasonId = parseInt(req.query.seasonId as string || '', 10);
  if (isNaN(seasonId)) {
    res.status(400).json({ error: 'seasonId مطلوب' });
    return;
  }
  const sales = await service.listWasteSales(seasonId);
  res.json(sales);
});

router.post('/waste', async (req, res) => {
  const result = service.wasteSaleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات مبيعات المخلفات غير مكتملة', details: result.error.format() });
    return;
  }
  const sale = await service.createWasteSale(result.data);
  res.status(201).json(sale);
});

router.put('/waste/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  const result = service.wasteSaleSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }
  const updated = await service.updateWasteSale(id, result.data);
  res.json(updated);
});

router.delete('/waste/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  await service.deleteWasteSale(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
