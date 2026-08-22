import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import { syncPurchaseToStock, revertPurchaseStock } from '../stock/stock.service';

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
  const purchaseDate = new Date(data.date);

  const purchase = await prisma.jawharaPurchase.create({
    data: {
      ...data,
      date: purchaseDate,
    },
  });

  // Sync to stock (IN)
  await syncPurchaseToStock(purchase.id, data.category, purchaseDate, data.sacksCount, data.customerName);

  return purchase;
}

export async function updateJawharaPurchase(id: number, data: Partial<JawharaPurchaseInput>) {
  const existing = await prisma.jawharaPurchase.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('PURCHASE_NOT_FOUND');
  }

  // Revert previous stock addition
  await revertPurchaseStock(id);

  const purchaseDate = data.date ? new Date(data.date) : existing.date;
  const updatedCategory = data.category || existing.category;
  const updatedSacks = data.sacksCount !== undefined ? data.sacksCount : existing.sacksCount;
  const updatedCustomer = data.customerName || existing.customerName;

  const updated = await prisma.jawharaPurchase.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });

  // Re-sync updated purchase to stock (IN)
  await syncPurchaseToStock(id, updatedCategory, purchaseDate, updatedSacks, updatedCustomer);

  return updated;
}

export async function deleteJawharaPurchase(id: number) {
  await revertPurchaseStock(id);
  return prisma.jawharaPurchase.delete({ where: { id } });
}
