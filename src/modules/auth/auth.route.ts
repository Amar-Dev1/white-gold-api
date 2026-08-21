import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as service from './auth.service';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const result = service.loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم وكلمة المرور بشكل صحيح', details: result.error.format() });
    return;
  }

  try {
    const { token, user, expiresAt } = await service.loginUser(result.data);

    res.cookie('wg_session', token, {
      httpOnly: true,
      expires: expiresAt,
      sameSite: 'lax',
    });

    res.json({ token, user });
  } catch (error: any) {
    if (error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }
    res.status(500).json({ error: 'فشل عملية تسجيل الدخول' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  await service.logoutUser(req.sessionToken);
  res.clearCookie('wg_session');
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
