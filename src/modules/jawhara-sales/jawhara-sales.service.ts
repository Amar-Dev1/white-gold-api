import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import { syncSaleToStock, revertSaleStock } from '../stock/stock.service';

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
  const saleDate = new Date(data.date);

  const sale = await prisma.jawharaSale.create({
    data: {
      ...data,
      date: saleDate,
    },
  });

  try {
    // Sync to stock (checks if stock quantity is sufficient!)
    await syncSaleToStock(sale.id, data.category, saleDate, data.quantity, data.customerName);
  } catch (error) {
    // Revert sale if stock validation failed!
    await prisma.jawharaSale.delete({ where: { id: sale.id } }).catch(() => {});
    throw error;
  }

  return sale;
}

export async function updateJawharaSale(id: number, data: Partial<JawharaSaleInput>) {
  const existing = await prisma.jawharaSale.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('SALE_NOT_FOUND');
  }

  // Revert previous stock deduction
  await revertSaleStock(id);

  const saleDate = data.date ? new Date(data.date) : existing.date;
  const updatedCategory = data.category || existing.category;
  const updatedQuantity = data.quantity !== undefined ? data.quantity : existing.quantity;
  const updatedCustomer = data.customerName || existing.customerName;

  try {
    // Check stock availability & sync
    await syncSaleToStock(id, updatedCategory, saleDate, updatedQuantity, updatedCustomer);
  } catch (error) {
    // Re-apply original stock deduction if update stock sync fails
    await syncSaleToStock(id, existing.category, existing.date, existing.quantity, existing.customerName).catch(() => {});
    throw error;
  }

  return prisma.jawharaSale.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });
}

export async function deleteJawharaSale(id: number) {
  await revertSaleStock(id);
  return prisma.jawharaSale.delete({ where: { id } });
}
