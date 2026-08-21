import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const jawharaPurchaseSchema = z.object({
  seasonId: z.number(),
  category: z.enum(['RAW', 'PRODUCTION', 'OTHER']),
  date: z.string(),
  sacksCount: z.number().min(1),
  weightKg: z.number().min(0),
  pricePerSack: z.number().min(0),
  totalAmount: z.number().min(0),
  truckPlateNumber: z.string(),
  customerName: z.string(),
});

export type JawharaPurchaseInput = z.infer<typeof jawharaPurchaseSchema>;

export async function listJawharaPurchases(seasonId: number, category?: string) {
  return prisma.jawharaPurchase.findMany({
    where: {
      seasonId,
      ...(category ? { category } : {}),
    },
    orderBy: { date: 'desc' },
  });
}

export async function createJawharaPurchase(data: JawharaPurchaseInput) {
  return prisma.jawharaPurchase.create({
    data: {
      ...data,
      date: new Date(data.date),
    },
  });
}

export async function updateJawharaPurchase(id: number, data: Partial<JawharaPurchaseInput>) {
  return prisma.jawharaPurchase.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });
}

export async function deleteJawharaPurchase(id: number) {
  return prisma.jawharaPurchase.delete({ where: { id } });
}
