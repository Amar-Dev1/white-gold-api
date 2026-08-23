import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const cottonSaleSchema = z.object({
  seasonId: z.number(),
  date: z.string(),
  quantity: z.number().min(1),
  weightKg: z.number().min(0),
  pricePerUnit: z.number().min(0),
  totalAmount: z.number().min(0),
  lotNumber: z.string().optional().default(''),
  customerName: z.string().optional().default(''),
  destination: z.string().optional().default(''),
});

export const wasteSaleSchema = z.object({
  seasonId: z.number(),
  date: z.string(),
  quantity: z.number().min(1),
  weightKg: z.number().min(0),
  pricePerUnit: z.number().min(0),
  totalAmount: z.number().min(0),
  type: z.string().optional().default('مخلفات حلج'),
  customerName: z.string().optional(),
});

export type CottonSaleInput = z.infer<typeof cottonSaleSchema>;
export type WasteSaleInput = z.infer<typeof wasteSaleSchema>;

// Cotton Sales (شعرة)
export async function listCottonSales(seasonId: number) {
  return prisma.cottonSale.findMany({
    where: { seasonId },
    orderBy: { date: 'desc' },
  });
}

export async function createCottonSale(data: CottonSaleInput) {
  return prisma.cottonSale.create({
    data: { ...data, date: new Date(data.date) },
  });
}

export async function updateCottonSale(id: number, data: Partial<CottonSaleInput>) {
  return prisma.cottonSale.update({
    where: { id },
    data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
  });
}

export async function deleteCottonSale(id: number) {
  return prisma.cottonSale.delete({ where: { id } });
}

// Waste Sales (مخلفات الحلج)
export async function listWasteSales(seasonId: number) {
  return prisma.wasteSale.findMany({
    where: { seasonId },
    orderBy: { date: 'desc' },
  });
}

export async function createWasteSale(data: WasteSaleInput) {
  const { customerName, ...rest } = data;
  return prisma.wasteSale.create({
    data: { ...rest, date: new Date(data.date) },
  });
}

export async function updateWasteSale(id: number, data: Partial<WasteSaleInput>) {
  const { customerName, ...rest } = data;
  return prisma.wasteSale.update({
    where: { id },
    data: { ...rest, ...(data.date ? { date: new Date(data.date) } : {}) },
  });
}

export async function deleteWasteSale(id: number) {
  return prisma.wasteSale.delete({ where: { id } });
}
