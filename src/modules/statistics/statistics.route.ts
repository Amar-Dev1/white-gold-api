import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as service from './statistics.service';

const router = Router();
router.use(requireAuth);

// GET /api/statistics?domain=X&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const domain = req.query.domain as 'WHITE_GOLD' | 'AL_JAWHARA' | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  if (!domain) {
    res.status(400).json({ error: 'المجال (domain) مطلوب' });
    return;
  }

  if (domain && req.user?.role !== 'ADMIN' && !req.user?.allowedDomains.includes(domain)) {
    res.status(403).json({ error: 'غير مصرح بالوصول لهذا المجال' });
    return;
  }

  const stats = await service.getStatistics(domain, from, to);
  res.json(stats);
});

export default router;
