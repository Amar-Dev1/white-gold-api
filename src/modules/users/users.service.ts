import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  password: z.string().min(4, 'كلمة المرور يجب أن تكون 4 أحرف على الأقل'),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
  domains: z.array(z.enum(['WHITE_GOLD', 'AL_JAWHARA'])).min(1, 'يجب تحديد مجال واحد على الأقل'),
});

export const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(4).optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
  domains: z.array(z.enum(['WHITE_GOLD', 'AL_JAWHARA'])).min(1).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export async function listUsers() {
  const users = await prisma.user.findMany({
    include: { domainAccess: true },
    orderBy: { createdAt: 'desc' },
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
    allowedDomains: u.role === 'ADMIN' 
      ? ['WHITE_GOLD', 'AL_JAWHARA'] 
      : u.domainAccess.map((da) => da.domain),
  }));
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) {
    throw new Error('USERNAME_EXISTS');
  }

  // Admins ALWAYS get full access to both domains
  const effectiveDomains = input.role === 'ADMIN'
    ? ['WHITE_GOLD', 'AL_JAWHARA']
    : input.domains;

  const passwordHash = await bcrypt.hash(input.password, 10);

  const newUser = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      role: input.role,
      domainAccess: {
        create: effectiveDomains.map((domain) => ({ domain })),
      },
    },
    include: { domainAccess: true },
  });

  return {
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    createdAt: newUser.createdAt,
    allowedDomains: newUser.role === 'ADMIN'
      ? ['WHITE_GOLD', 'AL_JAWHARA']
      : newUser.domainAccess.map((da) => da.domain),
  };
}

export async function updateUser(id: number, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // 1. Prevent demoting an Admin to Employee
  if (user.role === 'ADMIN' && input.role === 'EMPLOYEE') {
    throw new Error('CANNOT_DEMOTE_ADMIN');
  }

  if (input.username && input.username !== user.username) {
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing) {
      throw new Error('USERNAME_EXISTS');
    }
  }

  const effectiveRole = input.role || user.role;
  const updateData: any = {};
  if (input.username) updateData.username = input.username;
  if (input.role) updateData.role = input.role;
  if (input.password) updateData.passwordHash = await bcrypt.hash(input.password, 10);

  // Admins ALWAYS get full access to both domains
  const effectiveDomains = effectiveRole === 'ADMIN'
    ? ['WHITE_GOLD', 'AL_JAWHARA']
    : (input.domains || user.domainAccess.map((da) => da.domain));

  const updatedUser = await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id },
        data: updateData,
      });
    }

    if (effectiveDomains) {
      await tx.userDomainAccess.deleteMany({ where: { userId: id } });
      await tx.userDomainAccess.createMany({
        data: effectiveDomains.map((domain: string) => ({ userId: id, domain })),
      });
    }

    return tx.user.findUnique({
      where: { id },
      include: { domainAccess: true },
    });
  });

  if (!updatedUser) {
    throw new Error('UPDATE_FAILED');
  }

  return {
    id: updatedUser.id,
    username: updatedUser.username,
    role: updatedUser.role,
    createdAt: updatedUser.createdAt,
    allowedDomains: updatedUser.role === 'ADMIN'
      ? ['WHITE_GOLD', 'AL_JAWHARA']
      : updatedUser.domainAccess.map((da) => da.domain),
  };
}

export async function deleteUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  if (user.username === 'admin') {
    throw new Error('CANNOT_DELETE_PRIMARY_ADMIN');
  }

  return prisma.user.delete({ where: { id } });
}
