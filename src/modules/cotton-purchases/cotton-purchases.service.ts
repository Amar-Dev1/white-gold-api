import { prisma } from "../../lib/prisma";
import { z } from "zod";

export const cottonPurchaseSchema = z.object({
  date: z.string(),
  sacksCount: z.number().min(1),
  weightTornata: z.number().min(0),
  price: z.number().min(0),
  tierKilo: z.number().optional(),
  weightQuntar: z.number().optional(),
  totalAmount: z.number().optional(),
  truckPlateNumber: z.string().optional().default(""),
  customerName: z.string(),
});

export const packagingPurchaseSchema = z.object({
  date: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0),
  totalCost: z.number().min(0),
  type: z.string(),
  supplierName: z.string().optional(),
});

export type CottonPurchaseInput = z.infer<typeof cottonPurchaseSchema>;
export type PackagingPurchaseInput = z.infer<typeof packagingPurchaseSchema>;

export function computeCottonCalculations(sacksCount: number, weightTornata: number, price: number, inputWeightQuntar?: number) {
  const tierKilo = sacksCount * 1.335;
  const weightInKg = weightTornata > 500 ? weightTornata : weightTornata * 1000;
  const netKg = Math.max(0, weightInKg - tierKilo);
  const weightQuntar = inputWeightQuntar !== undefined && inputWeightQuntar > 0
    ? inputWeightQuntar
    : ((netKg * 2.205) / 315);
  const totalAmount = Math.round(price * weightQuntar);
  return { tierKilo, weightQuntar, totalAmount };
}

// Cotton Purchases
export async function listCottonPurchases() {
  return prisma.cottonPurchase.findMany({
    orderBy: { date: "desc" },
  });
}

export async function createCottonPurchase(data: CottonPurchaseInput) {
  const computed = computeCottonCalculations(
    data.sacksCount,
    data.weightTornata,
    data.price,
  );
  return prisma.cottonPurchase.create({
    data: {
      ...data,
      tierKilo: data.tierKilo ?? computed.tierKilo,
      weightQuntar: data.weightQuntar ?? computed.weightQuntar,
      totalAmount: data.totalAmount ?? computed.totalAmount,
      date: new Date(data.date),
    },
  });
}

export async function updateCottonPurchase(
  id: number,
  data: Partial<CottonPurchaseInput>,
) {
  const existing = await prisma.cottonPurchase.findUnique({ where: { id } });
  if (!existing) throw new Error("COTTON_PURCHASE_NOT_FOUND");

  const sacksCount = data.sacksCount ?? existing.sacksCount;
  const weightTornata = data.weightTornata ?? existing.weightTornata;
  const price = data.price ?? existing.price;

  const computed = computeCottonCalculations(sacksCount, weightTornata, price);

  return prisma.cottonPurchase.update({
    where: { id },
    data: {
      ...data,
      tierKilo: data.tierKilo ?? computed.tierKilo,
      weightQuntar: data.weightQuntar ?? computed.weightQuntar,
      totalAmount: data.totalAmount ?? computed.totalAmount,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });
}

export async function deleteCottonPurchase(id: number) {
  return prisma.cottonPurchase.delete({ where: { id } });
}

// Packaging Purchases
export async function listPackagingPurchases() {
  return prisma.packagingPurchase.findMany({
    orderBy: { date: "desc" },
  });
}

export async function createPackagingPurchase(data: PackagingPurchaseInput) {
  const { supplierName, ...rest } = data;
  return prisma.packagingPurchase.create({
    data: { ...rest, date: new Date(data.date) },
  });
}

export async function updatePackagingPurchase(
  id: number,
  data: Partial<PackagingPurchaseInput>,
) {
  const { supplierName, ...rest } = data;
  return prisma.packagingPurchase.update({
    where: { id },
    data: { ...rest, ...(data.date ? { date: new Date(data.date) } : {}) },
  });
}

export async function deletePackagingPurchase(id: number) {
  return prisma.packagingPurchase.delete({ where: { id } });
}
