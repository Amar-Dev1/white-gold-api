import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const cottonPurchaseSchema = z.object({
  seasonId: z.number(),
  date: z.string(),
  sacksCount: z.number().min(1),
  weightKg: z.number().min(0),
  pricePerSack: z.number().min(0),
  totalAmount: z.number().min(0),
  truckPlateNumber: z.string().optional().default(''),
  customerName: z.string(),
});

export const packagingPurchaseSchema = z.object({
  seasonId: z.number(),
  date: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0),
  totalCost: z.number().min(0),
  type: z.string(),
  supplierName: z.string().optional(),
});

export type CottonPurchaseInput = z.infer<typeof cottonPurchaseSchema>;
export type PackagingPurchaseInput = z.infer<typeof packagingPurchaseSchema>;

// Cotton Purchases
export async function listCottonPurchases(seasonId: number) {
  return prisma.cottonPurchase.findMany({
    where: { seasonId },
    orderBy: { date: 'desc' },
  });
}

export async function createCottonPurchase(data: CottonPurchaseInput) {
  return prisma.cottonPurchase.create({
    data: { ...data, date: new Date(data.date) },
  });
}

export async function updateCottonPurchase(id: number, data: Partial<CottonPurchaseInput>) {
  return prisma.cottonPurchase.update({
    where: { id },
    data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
  });
}

export async function deleteCottonPurchase(id: number) {
  return prisma.cottonPurchase.delete({ where: { id } });
}

// Packaging Purchases
export async function listPackagingPurchases(seasonId: number) {
  return prisma.packagingPurchase.findMany({
    where: { seasonId },
    orderBy: { date: 'desc' },
  });
}

export async function createPackagingPurchase(data: PackagingPurchaseInput) {
  const { supplierName, ...rest } = data;
  return prisma.packagingPurchase.create({
    data: { ...rest, date: new Date(data.date) },
  });
}

export async function updatePackagingPurchase(id: number, data: Partial<PackagingPurchaseInput>) {
  const { supplierName, ...rest } = data;
  return prisma.packagingPurchase.update({
    where: { id },
    data: { ...rest, ...(data.date ? { date: new Date(data.date) } : {}) },
  });
}

export async function deletePackagingPurchase(id: number) {
  return prisma.packagingPurchase.delete({ where: { id } });
}
