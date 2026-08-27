import { prisma } from '../../lib/prisma';

export async function getStatistics(
  domain: 'WHITE_GOLD' | 'AL_JAWHARA',
  fromStr?: string,
  toStr?: string
) {
  // If dates aren't provided, we fetch all-time data
  let dateFilter: any = undefined;
  if (fromStr && toStr) {
    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    toDate.setHours(23, 59, 59, 999); // end of the day

    dateFilter = {
      gte: fromDate,
      lte: toDate,
    };
  }

  let purchasesCount = 0;
  let purchasesTotal = 0;
  let salesCount = 0;
  let salesTotal = 0;
  let expensesCount = 0;
  let expensesTotal = 0;

  if (domain === 'WHITE_GOLD') {
    const cottonSalesAgg = await prisma.cottonSale.aggregate({
      where: dateFilter ? { date: dateFilter } : undefined,
      _sum: { totalAmount: true },
      _count: true,
    });
    const wasteSalesAgg = await prisma.wasteSale.aggregate({
      where: dateFilter ? { date: dateFilter } : undefined,
      _sum: { totalAmount: true },
      _count: true,
    });
    salesTotal = (cottonSalesAgg._sum.totalAmount || 0) + (wasteSalesAgg._sum.totalAmount || 0);
    salesCount = cottonSalesAgg._count + wasteSalesAgg._count;

    const cottonPurchasesAgg = await prisma.cottonPurchase.aggregate({
      where: dateFilter ? { date: dateFilter } : undefined,
      _sum: { totalAmount: true },
      _count: true,
    });
    const packagingPurchasesAgg = await prisma.packagingPurchase.aggregate({
      where: dateFilter ? { date: dateFilter } : undefined,
      _sum: { totalCost: true },
      _count: true,
    });
    purchasesTotal = (cottonPurchasesAgg._sum.totalAmount || 0) + (packagingPurchasesAgg._sum.totalCost || 0);
    purchasesCount = cottonPurchasesAgg._count + packagingPurchasesAgg._count;

  } else {
    // AL_JAWHARA
    const jawharaSalesAgg = await prisma.jawharaSale.aggregate({
      where: dateFilter ? { date: dateFilter } : undefined,
      _sum: { totalAmount: true },
      _count: true,
    });
    salesTotal = jawharaSalesAgg._sum.totalAmount || 0;
    salesCount = jawharaSalesAgg._count;

    const jawharaPurchasesAgg = await prisma.jawharaPurchase.aggregate({
      where: dateFilter ? { date: dateFilter } : undefined,
      _sum: { totalAmount: true },
      _count: true,
    });
    purchasesTotal = jawharaPurchasesAgg._sum.totalAmount || 0;
    purchasesCount = jawharaPurchasesAgg._count;

    const jawharaExpensesAgg = await prisma.jawharaExpense.aggregate({
      where: dateFilter ? { date: dateFilter } : undefined,
      _sum: { amount: true },
      _count: true,
    });
    expensesTotal = jawharaExpensesAgg._sum.amount || 0;
    expensesCount = jawharaExpensesAgg._count;
  }

  const netProfit = salesTotal - purchasesTotal - expensesTotal;

  return {
    domain,
    period: {
      from: fromStr || 'ALL_TIME',
      to: toStr || 'ALL_TIME',
    },
    purchases: { count: purchasesCount, total: purchasesTotal },
    sales: { count: salesCount, total: salesTotal },
    expenses: { count: expensesCount, total: expensesTotal },
    netProfit,
  };
}
