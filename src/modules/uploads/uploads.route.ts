import { Router } from 'express';
import { upload } from '../../lib/upload';
import { requireAuth } from '../../middleware/auth';

const router = Router();
router.use(requireAuth);

// Generic upload endpoint
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'لم يتم تقديم أي ملف' });
    return;
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ url: fileUrl, filename: req.file.filename });
});

export default router;
