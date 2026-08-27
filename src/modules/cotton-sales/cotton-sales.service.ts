import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const cottonSaleSchema = z.object({
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
export async function listCottonSales() {
  return prisma.cottonSale.findMany({
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
export async function listWasteSales() {
  return prisma.wasteSale.findMany({
    orderBy: { date: 'desc' },
  });
}

export async function createWasteSale(data: WasteSaleInput) {
  return prisma.wasteSale.create({
    data: { ...data, date: new Date(data.date) },
  });
}

export async function updateWasteSale(id: number, data: Partial<WasteSaleInput>) {
  return prisma.wasteSale.update({
    where: { id },
    data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
  });
}

export async function deleteWasteSale(id: number) {
  return prisma.wasteSale.delete({ where: { id } });
}
