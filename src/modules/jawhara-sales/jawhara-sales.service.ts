import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const jawharaSaleSchema = z.object({
  seasonId: z.number(),
  category: z.enum(['FEED', 'OIL', 'WASTE']),
  date: z.string(),
  quantity: z.number().min(1),
  weightKg: z.number().min(0),
  pricePerUnit: z.number().min(0),
  totalAmount: z.number().min(0),
  customerName: z.string(),
});

export type JawharaSaleInput = z.infer<typeof jawharaSaleSchema>;

export async function listJawharaSales(seasonId: number, category?: string) {
  return prisma.jawharaSale.findMany({
    where: {
      seasonId,
      ...(category ? { category } : {}),
    },
    orderBy: { date: 'desc' },
  });
}

export async function createJawharaSale(data: JawharaSaleInput) {
  return prisma.jawharaSale.create({
    data: {
      ...data,
      date: new Date(data.date),
    },
  });
}

export async function updateJawharaSale(id: number, data: Partial<JawharaSaleInput>) {
  return prisma.jawharaSale.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });
}

export async function deleteJawharaSale(id: number) {
  return prisma.jawharaSale.delete({ where: { id } });
}
