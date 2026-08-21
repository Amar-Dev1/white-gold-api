import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    include: { domainAccess: true },
  });

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const responseUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    allowedDomains: user.domainAccess.map((da) => da.domain),
  };

  return { token, user: responseUser, expiresAt };
}

export async function logoutUser(sessionToken?: string) {
  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { token: sessionToken },
    }).catch(() => {});
  }
}
