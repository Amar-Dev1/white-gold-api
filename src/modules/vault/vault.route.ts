import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as service from './vault.service';

const router = Router();

// GET /api/vault?seasonId=X&domain=WHITE_GOLD
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const seasonId = parseInt(req.query.seasonId as string || '', 10);
  const domain = req.query.domain as 'WHITE_GOLD' | 'AL_JAWHARA' | undefined;

  if (isNaN(seasonId) || !domain) {
    res.status(400).json({ error: 'seasonId و domain مطلوبان' });
    return;
  }

  const summary = await service.getVaultSummary(seasonId, domain);
  res.json(summary);
});

// PATCH /api/vault/:id (Update initial capital)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'معرف الخزنة غير صحيح' });
    return;
  }

  const { initialCapital } = req.body;
  if (typeof initialCapital !== 'number' || initialCapital < 0) {
    res.status(400).json({ error: 'مبلغ رأس المال غير صحيح' });
    return;
  }

  const updated = await service.updateVaultCapital(id, initialCapital);
  res.json(updated);
});

export default router;
