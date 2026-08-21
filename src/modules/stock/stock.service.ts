import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const stockItemSchema = z.object({
  category: z.enum(['FEED', 'OIL', 'WASTE', 'SPARE_PARTS', 'PACKAGING']),
  itemName: z.string().min(1),
  currentQuantity: z.number().min(0).default(0),
  unit: z.string().min(1),
});

export const stockMovementSchema = z.object({
  date: z.string(),
  movementType: z.enum(['IN', 'OUT']),
  quantity: z.number().positive(),
  referenceType: z.string().optional(),
  referenceId: z.number().optional(),
  notes: z.string().optional(),
});

export type StockItemInput = z.infer<typeof stockItemSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export async function listStockItems(category?: string) {
  return prisma.stock.findMany({
    where: category ? { category } : undefined,
    orderBy: { lastUpdated: 'desc' },
  });
}

export async function createStockItem(data: StockItemInput) {
  return prisma.stock.create({ data });
}

export async function updateStockItem(id: number, data: Partial<StockItemInput>) {
  return prisma.stock.update({
    where: { id },
    data,
  });
}

export async function deleteStockItem(id: number) {
  return prisma.stock.delete({ where: { id } });
}

export async function recordStockMovement(id: number, data: StockMovementInput) {
  const stock = await prisma.stock.findUnique({ where: { id } });
  if (!stock) {
    throw new Error('STOCK_NOT_FOUND');
  }

  let newQuantity = stock.currentQuantity;
  if (data.movementType === 'IN') {
    newQuantity += data.quantity;
  } else {
    newQuantity = Math.max(0, newQuantity - data.quantity);
  }

  const [movement, updatedStock] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        stockId: id,
        date: new Date(data.date),
        movementType: data.movementType,
        quantity: data.quantity,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes,
      },
    }),
    prisma.stock.update({
      where: { id },
      data: { currentQuantity: newQuantity },
    }),
  ]);

  return { movement, stock: updatedStock };
}

export async function listStockMovements(stockId: number) {
  return prisma.stockMovement.findMany({
    where: { stockId },
    orderBy: { date: 'desc' },
  });
}
