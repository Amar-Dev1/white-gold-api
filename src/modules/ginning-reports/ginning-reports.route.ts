import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireDomain } from '../../middleware/auth';
import * as service from './ginning-reports.service';
import { upload, UPLOAD_DIR } from '../../lib/upload';

const router = Router();
router.use(requireAuth, requireDomain('WHITE_GOLD'));

// GET /api/wg/reports
router.get('/', async (req, res) => {
  const reports = await service.listGinningReports();
  res.json(reports);
});

// POST /api/wg/reports
router.post('/', upload.single('report'), async (req, res) => {
  try {
    let imageUrl = '';

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body?.imageUrl) {
      const inputUrl = req.body.imageUrl;
      // Handle base64 data URL
      if (typeof inputUrl === 'string' && inputUrl.startsWith('data:')) {
        const matches = inputUrl.match(/^data:([A-Za-z0-9\-+\/]+);base64,(.+)$/);
        if (matches && matches[1] && matches[2]) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          let ext = 'jpg';
          if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('webp')) ext = 'webp';
          else if (mimeType.includes('pdf')) ext = 'pdf';

          const filename = `report-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
          const filePath = path.join(UPLOAD_DIR, filename);

          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          imageUrl = `/uploads/${filename}`;
        } else {
          imageUrl = inputUrl;
        }
      } else {
        imageUrl = inputUrl;
      }
    }

    if (!imageUrl) {
      res.status(400).json({ error: 'لم يتم تقديم ملف أو صورة للتقرير' });
      return;
    }

    const report = await service.createGinningReport(imageUrl);
    res.status(201).json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'فشل حفظ التقرير' });
  }
});

// DELETE /api/wg/reports/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(String(req.params.id || ''), 10);
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
