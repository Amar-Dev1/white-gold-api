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

// POST /api/auth/verify-password (Domain entry authentication)
router.post('/verify-password', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'كلمة المرور مطلوبة' });
    return;
  }

  const isValid = await service.verifyUserPassword(req.user!.id, password);
  if (!isValid) {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    return;
  }

  res.json({ success: true, message: 'تم التحقق من كلمة المرور بنجاح' });
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
