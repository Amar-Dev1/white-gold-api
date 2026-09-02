import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as service from './vault.service';

const router = Router();

// GET /api/vault/summary?domain=WHITE_GOLD
router.get('/summary', requireAuth, requireAdmin, async (req, res) => {
  const domain = req.query.domain as 'WHITE_GOLD' | 'AL_JAWHARA' | undefined;

  if (!domain) {
    res.status(400).json({ error: 'المجال (domain) مطلوب' });
    return;
  }

  const summary = await service.getVaultSummary(domain);
  res.json(summary);
});

// GET /api/vault/transactions?domain=WHITE_GOLD
router.get('/transactions', requireAuth, requireAdmin, async (req, res) => {
  const domain = req.query.domain as 'WHITE_GOLD' | 'AL_JAWHARA' | undefined;

  if (!domain) {
    res.status(400).json({ error: 'المجال (domain) مطلوب' });
    return;
  }

  const transactions = await service.getVaultTransactions(domain);
  res.json(transactions);
});

// POST /api/vault/adjustments — (تعديل الرصيد المتاح / قيد تسوية يدوي)
router.post('/adjustments', requireAuth, requireAdmin, async (req, res) => {
  const { vaultId, ...rest } = req.body;
  const parsedVaultId = parseInt(vaultId, 10);
  if (isNaN(parsedVaultId)) {
    res.status(400).json({ error: 'vaultId مطلوب' });
    return;
  }

  const result = service.vaultAdjustmentSchema.safeParse(rest);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات التسوية غير مكتملة', details: result.error.format() });
    return;
  }

  try {
    const adjustment = await service.createVaultAdjustment(parsedVaultId, result.data);
    res.status(201).json(adjustment);
  } catch (error: any) {
    if (error.message === 'VAULT_NOT_FOUND') {
      res.status(404).json({ error: 'الخزنة غير موجودة' });
      return;
    }
    res.status(500).json({ error: 'فشل إضافة قيد التسوية' });
  }
});

// DELETE /api/vault/adjustments/:id
router.delete('/adjustments/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id || ''), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'المعرف غير صحيح' });
    return;
  }

  await service.deleteVaultAdjustment(id);
  res.json({ message: 'تم حذف قيد التسوية بنجاح' });
});

// PATCH /api/vault/:id (Update initial capital — one-time only)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id || ''), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'معرف الخزنة غير صحيح' });
    return;
  }

  const { initialCapital } = req.body;
  if (typeof initialCapital !== 'number' || initialCapital < 0) {
    res.status(400).json({ error: 'مبلغ رأس المال غير صحيح' });
    return;
  }

  try {
    const updated = await service.updateVaultCapital(id, initialCapital);
    res.json(updated);
  } catch (error: any) {
    if (error.message === 'CAPITAL_ALREADY_SET') {
      res.status(400).json({ error: 'رأس المال الثابت تم تحديده مسبقاً ولا يمكن تعديله' });
      return;
    }
    if (error.message === 'VAULT_NOT_FOUND') {
      res.status(404).json({ error: 'الخزنة غير موجودة' });
      return;
    }
    res.status(500).json({ error: 'فشل تحديث الخزنة' });
  }
});

// POST /api/vault/:id/emergency-override (Emergency Admin bypass)
router.post('/:id/emergency-override', requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id || ''), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'معرف الخزنة غير صحيح' });
    return;
  }

  const { initialCapital } = req.body;
  if (typeof initialCapital !== 'number' || initialCapital < 0) {
    res.status(400).json({ error: 'مبلغ رأس المال غير صحيح' });
    return;
  }

  try {
    const updated = await service.emergencyOverrideVaultCapital(id, initialCapital);
    res.json(updated);
  } catch (error: any) {
    if (error.message === 'VAULT_NOT_FOUND') {
      res.status(404).json({ error: 'الخزنة غير موجودة' });
      return;
    }
    res.status(500).json({ error: 'فشل تعديل رأس المال الطارئ' });
  }
});

export default router;
