import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as service from './seasons.service';

const router = Router();

// GET /api/seasons?domain=WHITE_GOLD
router.get('/', requireAuth, async (req, res) => {
  const domain = req.query.domain as string | undefined;
  const seasons = await service.listSeasons(domain);
  res.json(seasons);
});

// POST /api/seasons (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const result = service.createSeasonSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات الموسم غير مكتملة', details: result.error.format() });
    return;
  }

  const season = await service.createSeason(result.data);
  res.status(201).json(season);
});

// PATCH /api/seasons/:id (Admin only)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'معرف الموسم غير صحيح' });
    return;
  }

  try {
    const updated = await service.updateSeason(id, req.body);
    res.json(updated);
  } catch (error: any) {
    if (error.message === 'SEASON_NOT_FOUND') {
      res.status(404).json({ error: 'الموسم غير موجود' });
      return;
    }
    res.status(500).json({ error: 'فشل تعديل الموسم' });
  }
});

export default router;
