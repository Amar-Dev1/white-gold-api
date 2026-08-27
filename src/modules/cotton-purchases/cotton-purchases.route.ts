import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './cotton-purchases.service';

const router = Router();
router.use(requireAuth, requireDomain('WHITE_GOLD'));

// Cotton Purchases Routes
router.get('/cotton', async (req, res) => {
  const purchases = await service.listCottonPurchases();
  res.json(purchases);
});

router.post('/cotton', async (req, res) => {
  const result = service.cottonPurchaseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات شراء القطن غير مكتملة', details: result.error.format() });
    return;
  }
  const purchase = await service.createCottonPurchase(result.data);
  res.status(201).json(purchase);
});

router.put('/cotton/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  const result = service.cottonPurchaseSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }
  const updated = await service.updateCottonPurchase(id, result.data);
  res.json(updated);
});

router.delete('/cotton/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  await service.deleteCottonPurchase(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

// Packaging Purchases Routes
router.get('/packaging', async (req, res) => {
  const purchases = await service.listPackagingPurchases();
  res.json(purchases);
});

router.post('/packaging', async (req, res) => {
  const result = service.packagingPurchaseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات شراء مواد التعبئة غير مكتملة', details: result.error.format() });
    return;
  }
  const purchase = await service.createPackagingPurchase(result.data);
  res.status(201).json(purchase);
});

router.put('/packaging/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  const result = service.packagingPurchaseSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }
  const updated = await service.updatePackagingPurchase(id, result.data);
  res.json(updated);
});

router.delete('/packaging/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }
  await service.deletePackagingPurchase(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
