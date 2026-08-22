import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const createSeasonSchema = z.object({
  name: z.string().min(1, 'اسم الموسم مطلوب'),
  domain: z.enum(['WHITE_GOLD', 'AL_JAWHARA']),
  startDate: z.string(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  initialCapital: z.number().optional().default(0),
});

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;

export async function listSeasons(domain?: string) {
  return prisma.season.findMany({
    where: domain ? { domain } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSeason(input: CreateSeasonInput) {
  if (input.isActive) {
    await prisma.season.updateMany({
      where: { domain: input.domain, isActive: true },
      data: { isActive: false },
    });
  }

  return prisma.season.create({
    data: {
      name: input.name,
      domain: input.domain,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: input.isActive,
      vaults: {
        create: {
          domain: input.domain,
          initialCapital: input.initialCapital || 0,
        },
      },
    },
    include: { vaults: true },
  });
}

export async function updateSeason(
  id: number,
  data: { name?: string; startDate?: string; endDate?: string | null; isActive?: boolean }
) {
  const existing = await prisma.season.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('SEASON_NOT_FOUND');
  }

  if (data.isActive) {
    await prisma.season.updateMany({
      where: { domain: existing.domain, isActive: true, id: { not: id } },
      data: { isActive: false },
    });
  }

  return prisma.season.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
    },
  });
}

// Season Summary — aggregates all financial data for a season
export async function getSeasonSummary(seasonId: number, domain: 'WHITE_GOLD' | 'AL_JAWHARA') {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error('SEASON_NOT_FOUND');

  const vault = await prisma.vault.findUnique({
    where: { seasonId_domain: { seasonId, domain } },
  });

  let creditTotal = 0;
  let debitTotal = 0;
  let purchasesCount = 0;
  let salesCount = 0;
  let reportsCount = 0;
  let expensesCount = 0;

  if (domain === 'WHITE_GOLD') {
    const cottonSalesAgg = await prisma.cottonSale.aggregate({ where: { seasonId }, _sum: { totalAmount: true }, _count: true });
    const wasteSalesAgg = await prisma.wasteSale.aggregate({ where: { seasonId }, _sum: { totalAmount: true }, _count: true });
    creditTotal = (cottonSalesAgg._sum.totalAmount || 0) + (wasteSalesAgg._sum.totalAmount || 0);
    salesCount = cottonSalesAgg._count + wasteSalesAgg._count;

    const cottonPurchasesAgg = await prisma.cottonPurchase.aggregate({ where: { seasonId }, _sum: { totalAmount: true }, _count: true });
    const packagingPurchasesAgg = await prisma.packagingPurchase.aggregate({ where: { seasonId }, _sum: { totalCost: true }, _count: true });
    debitTotal = (cottonPurchasesAgg._sum.totalAmount || 0) + (packagingPurchasesAgg._sum.totalCost || 0);
    purchasesCount = cottonPurchasesAgg._count + packagingPurchasesAgg._count;

    reportsCount = await prisma.ginningReport.count({ where: { seasonId } });
  } else {
    const jawharaSalesAgg = await prisma.jawharaSale.aggregate({ where: { seasonId }, _sum: { totalAmount: true }, _count: true });
    creditTotal = jawharaSalesAgg._sum.totalAmount || 0;
    salesCount = jawharaSalesAgg._count;

    const jawharaPurchasesAgg = await prisma.jawharaPurchase.aggregate({ where: { seasonId }, _sum: { totalAmount: true }, _count: true });
    const jawharaExpensesAgg = await prisma.jawharaExpense.aggregate({ where: { seasonId }, _sum: { amount: true }, _count: true });
    debitTotal = (jawharaPurchasesAgg._sum.totalAmount || 0) + (jawharaExpensesAgg._sum.amount || 0);
    purchasesCount = jawharaPurchasesAgg._count;
    expensesCount = jawharaExpensesAgg._count;
  }

  const initialCapital = vault?.initialCapital || 0;
  const availableBalance = initialCapital + creditTotal - debitTotal;
  const earnings = availableBalance - initialCapital; // net gain/loss

  return {
    season,
    initialCapital,
    creditTotal,
    debitTotal,
    availableBalance,
    earnings,
    purchasesCount,
    salesCount,
    reportsCount,
    expensesCount,
  };
}

// Paginated data fetchers for season dashboard drill-down
export async function getSeasonPurchases(seasonId: number, domain: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  if (domain === 'WHITE_GOLD') {
    const [cottonData, cottonTotal, packData, packTotal] = await Promise.all([
      prisma.cottonPurchase.findMany({ where: { seasonId }, orderBy: { date: 'desc' }, skip, take: limit }),
      prisma.cottonPurchase.count({ where: { seasonId } }),
      prisma.packagingPurchase.findMany({ where: { seasonId }, orderBy: { date: 'desc' }, skip, take: limit }),
      prisma.packagingPurchase.count({ where: { seasonId } }),
    ]);
    return { cotton: { data: cottonData, total: cottonTotal }, packaging: { data: packData, total: packTotal } };
  } else {
    const [data, total] = await Promise.all([
      prisma.jawharaPurchase.findMany({ where: { seasonId }, orderBy: { date: 'desc' }, skip, take: limit }),
      prisma.jawharaPurchase.count({ where: { seasonId } }),
    ]);
    return { data, total };
  }
}

export async function getSeasonSales(seasonId: number, domain: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  if (domain === 'WHITE_GOLD') {
    const [cottonData, cottonTotal, wasteData, wasteTotal] = await Promise.all([
      prisma.cottonSale.findMany({ where: { seasonId }, orderBy: { date: 'desc' }, skip, take: limit }),
      prisma.cottonSale.count({ where: { seasonId } }),
      prisma.wasteSale.findMany({ where: { seasonId }, orderBy: { date: 'desc' }, skip, take: limit }),
      prisma.wasteSale.count({ where: { seasonId } }),
    ]);
    return { cotton: { data: cottonData, total: cottonTotal }, waste: { data: wasteData, total: wasteTotal } };
  } else {
    const [data, total] = await Promise.all([
      prisma.jawharaSale.findMany({ where: { seasonId }, orderBy: { date: 'desc' }, skip, take: limit }),
      prisma.jawharaSale.count({ where: { seasonId } }),
    ]);
    return { data, total };
  }
}

export async function getSeasonExpenses(seasonId: number, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.jawharaExpense.findMany({ where: { seasonId }, orderBy: { date: 'desc' }, skip, take: limit }),
    prisma.jawharaExpense.count({ where: { seasonId } }),
  ]);
  return { data, total };
}
