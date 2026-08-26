import { Router } from 'express';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './ginning-reports.service';
import { upload } from '../../lib/upload';

const router = Router();
router.use(requireAuth, requireDomain('WHITE_GOLD'));

// GET /api/wg/reports?seasonId=X
router.get('/', async (req, res) => {
  const seasonId = parseInt(req.query.seasonId as string || '', 10);
  if (isNaN(seasonId)) {
    res.status(400).json({ error: 'seasonId مطلوب' });
    return;
  }
  const reports = await service.listGinningReports(seasonId);
  res.json(reports);
});

// POST /api/wg/reports
router.post('/', upload.single('image'), async (req, res) => {
  const seasonId = parseInt(req.body.seasonId || '', 10);
  if (isNaN(seasonId)) {
    res.status(400).json({ error: 'seasonId مطلوب' });
    return;
  }

  let imageUrl = req.body.imageUrl;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  }

  if (!imageUrl) {
    res.status(400).json({ error: 'يجب تقديم صورة التقرير' });
    return;
  }

  const report = await service.createGinningReport(seasonId, imageUrl);
  res.status(201).json(report);
});

// DELETE /api/wg/reports/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  try {
    await service.deleteGinningReport(id);
    res.json({ message: 'تم حذف التقرير بنجاح' });
  } catch (error: any) {
    if (error.message === 'REPORT_NOT_FOUND') {
      res.status(404).json({ error: 'التقرير غير موجود' });
      return;
    }
    res.status(500).json({ error: 'فشل حذف التقرير' });
  }
});

export default router;
