import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const createSeasonSchema = z.object({
  name: z.string().min(1, 'اسم الموسم مطلوب'),
  domain: z.enum(['WHITE_GOLD', 'AL_JAWHARA']),
  startDate: z.string(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  initialCapital: z.number().optional().default(0),
});

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;

export async function listSeasons(domain?: string) {
  return prisma.season.findMany({
    where: domain ? { domain } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSeason(input: CreateSeasonInput) {
  if (input.isActive) {
    await prisma.season.updateMany({
      where: { domain: input.domain, isActive: true },
      data: { isActive: false },
    });
  }

  return prisma.season.create({
    data: {
      name: input.name,
      domain: input.domain,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: input.isActive,
      vaults: {
        create: {
          domain: input.domain,
          initialCapital: input.initialCapital || 0,
        },
      },
    },
    include: { vaults: true },
  });
}

export async function updateSeason(
  id: number,
  data: { name?: string; isActive?: boolean; endDate?: string | null }
) {
  const existing = await prisma.season.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('SEASON_NOT_FOUND');
  }

  if (data.isActive) {
    await prisma.season.updateMany({
      where: { domain: existing.domain, isActive: true, id: { not: id } },
      data: { isActive: false },
    });
  }

  return prisma.season.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
    },
  });
}
