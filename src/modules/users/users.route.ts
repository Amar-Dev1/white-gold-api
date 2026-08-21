import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as service from './users.service';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/users
router.get('/', async (_req, res) => {
  const users = await service.listUsers();
  res.json(users);
});

// POST /api/users
router.post('/', async (req, res) => {
  const result = service.createUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات المستخدم غير مكتملة', details: result.error.format() });
    return;
  }

  try {
    const newUser = await service.createUser(result.data);
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.message === 'USERNAME_EXISTS') {
      res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
      return;
    }
    res.status(500).json({ error: 'فشل إنشاء المستخدم' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'معرف المستخدم غير صحيح' });
    return;
  }

  const result = service.updateUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'بيانات التحديث غير صحيحة', details: result.error.format() });
    return;
  }

  try {
    const updatedUser = await service.updateUser(id, result.data);
    res.json(updatedUser);
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'المستخدم غير موجود' });
      return;
    }
    if (error.message === 'USERNAME_EXISTS') {
      res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
      return;
    }
    res.status(500).json({ error: 'فشل تحديث المستخدم' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id || '', 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'معرف المستخدم غير صحيح' });
    return;
  }

  try {
    await service.deleteUser(id);
    res.json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'المستخدم غير موجود' });
      return;
    }
    res.status(500).json({ error: 'فشل حذف المستخدم' });
  }
});

export default router;
