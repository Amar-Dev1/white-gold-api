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
    if (stock.currentQuantity < data.quantity) {
      throw new Error(`INSUFFICIENT_STOCK:المخزون المتاح غير كافٍ (المتاح: ${stock.currentQuantity} ${stock.unit}، المطلوب: ${data.quantity} ${stock.unit})`);
    }
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

// Ensure Stock item exists for a category
export async function ensureStockItemForCategory(category: string, defaultName: string, unit: string) {
  let stock = await prisma.stock.findFirst({
    where: { category },
  });

  if (!stock) {
    stock = await prisma.stock.create({
      data: {
        category,
        itemName: defaultName,
        currentQuantity: 0,
        unit,
      },
    });
  }

  return stock;
}

// Sync Sale operation to Stock (OUT) with strict availability check
export async function syncSaleToStock(saleId: number, category: string, date: Date, quantity: number, customerName: string) {
  const defaultNames: Record<string, string> = {
    FEED: 'مخزون أمباز (علف البذرة)',
    OIL: 'مخزون زيت البذرة النقي',
    WASTE: 'مخزون مخلفات العصر',
  };
  const defaultUnits: Record<string, string> = {
    FEED: 'جوال',
    OIL: 'برميل',
    WASTE: 'طن',
  };

  const stock = await ensureStockItemForCategory(
    category,
    defaultNames[category] || `مخزون ${category}`,
    defaultUnits[category] || 'وحدة'
  );

  if (stock.currentQuantity < quantity) {
    throw new Error(`INSUFFICIENT_STOCK:المخزون المتاح غير كافٍ لإتمام عملية البيع (المتاح حالياً بالمخزن: ${stock.currentQuantity} ${stock.unit}، والمطلوب بيعه: ${quantity} ${stock.unit})`);
  }

  const newQuantity = stock.currentQuantity - quantity;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        stockId: stock.id,
        date,
        movementType: 'OUT',
        quantity,
        referenceType: 'JAWHARA_SALE',
        referenceId: saleId,
        notes: `بيع لـ ${customerName}`,
      },
    }),
    prisma.stock.update({
      where: { id: stock.id },
      data: { currentQuantity: newQuantity },
    }),
  ]);
}

// Sync Purchase operation to Stock (IN)
export async function syncPurchaseToStock(purchaseId: number, category: string, date: Date, quantity: number, customerName: string) {
  const categoryMap: Record<string, string> = {
    RAW: 'FEED',
    PRODUCTION: 'PACKAGING',
    OTHER: 'SPARE_PARTS',
  };
  const defaultNames: Record<string, string> = {
    RAW: 'مخزون خام بذرة القطن',
    PRODUCTION: 'مخزون مستلزمات الإنتاج والتعبئة',
    OTHER: 'مخزون قطع غيار ومستلزمات تشغيل',
  };

  const stockCategory = categoryMap[category] || 'SPARE_PARTS';
  const stock = await ensureStockItemForCategory(
    stockCategory,
    defaultNames[category] || `مخزون ${category}`,
    'جوال'
  );

  const newQuantity = stock.currentQuantity + quantity;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        stockId: stock.id,
        date,
        movementType: 'IN',
        quantity,
        referenceType: 'JAWHARA_PURCHASE',
        referenceId: purchaseId,
        notes: `شراء من ${customerName}`,
      },
    }),
    prisma.stock.update({
      where: { id: stock.id },
      data: { currentQuantity: newQuantity },
    }),
  ]);
}

// Revert Sale Stock on update/delete
export async function revertSaleStock(saleId: number) {
  const movements = await prisma.stockMovement.findMany({
    where: { referenceType: 'JAWHARA_SALE', referenceId: saleId },
  });

  for (const m of movements) {
    const stock = await prisma.stock.findUnique({ where: { id: m.stockId } });
    if (stock) {
      await prisma.stock.update({
        where: { id: stock.id },
        data: { currentQuantity: stock.currentQuantity + m.quantity },
      });
    }
  }

  await prisma.stockMovement.deleteMany({
    where: { referenceType: 'JAWHARA_SALE', referenceId: saleId },
  });
}

// Revert Purchase Stock on update/delete
export async function revertPurchaseStock(purchaseId: number) {
  const movements = await prisma.stockMovement.findMany({
    where: { referenceType: 'JAWHARA_PURCHASE', referenceId: purchaseId },
  });

  for (const m of movements) {
    const stock = await prisma.stock.findUnique({ where: { id: m.stockId } });
    if (stock) {
      await prisma.stock.update({
        where: { id: stock.id },
        data: { currentQuantity: Math.max(0, stock.currentQuantity - m.quantity) },
      });
    }
  }

  await prisma.stockMovement.deleteMany({
    where: { referenceType: 'JAWHARA_PURCHASE', referenceId: purchaseId },
  });
}
