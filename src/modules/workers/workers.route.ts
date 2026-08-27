import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as service from './workers.service';

const router = Router();
router.use(requireAuth);

// GET /api/workers?domain=Y
router.get('/', async (req, res) => {
  const domain = req.query.domain as 'WHITE_GOLD' | 'AL_JAWHARA' | undefined;

  if (domain && req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(domain)) {
    res.status(403).json({ error: 'غير مصرح بالوصول لهذا المجال' });
    return;
  }

  const workers = await service.listWorkers(domain);
  res.json(workers);
});

// POST /api/workers
router.post('/', async (req, res) => {
  const result = service.workerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات العامل غير مكتملة', details: result.error.format() });
    return;
  }

  const { domain } = result.data;
  if (req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(domain)) {
    res.status(403).json({ error: 'غير مصرح بالإضافة لهذا المجال' });
    return;
  }

  const worker = await service.createWorker(result.data);
  res.status(201).json(worker);
});

// PUT /api/workers/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  const result = service.workerSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'البيانات غير صحيحة', details: result.error.format() });
    return;
  }

  const updated = await service.updateWorker(id, result.data);
  res.json(updated);
});

// DELETE /api/workers/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteWorker(id);
  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
