import { prisma } from '../../lib/prisma';

export async function getVaultSummary(seasonId: number, domain: 'WHITE_GOLD' | 'AL_JAWHARA') {
  let vault = await prisma.vault.findUnique({
    where: {
      seasonId_domain: { seasonId, domain },
    },
  });

  if (!vault) {
    vault = await prisma.vault.create({
      data: {
        seasonId,
        domain,
        initialCapital: 0,
      },
    });
  }

  let creditTotal = 0;
  let debitTotal = 0;

  if (domain === 'WHITE_GOLD') {
    const cottonSales = await prisma.cottonSale.aggregate({
      where: { seasonId },
      _sum: { totalAmount: true },
    });
    const wasteSales = await prisma.wasteSale.aggregate({
      where: { seasonId },
      _sum: { totalAmount: true },
    });
    creditTotal = (cottonSales._sum.totalAmount || 0) + (wasteSales._sum.totalAmount || 0);

    const cottonPurchases = await prisma.cottonPurchase.aggregate({
      where: { seasonId },
      _sum: { totalAmount: true },
    });
    const packagingPurchases = await prisma.packagingPurchase.aggregate({
      where: { seasonId },
      _sum: { totalCost: true },
    });
    debitTotal = (cottonPurchases._sum.totalAmount || 0) + (packagingPurchases._sum.totalCost || 0);
  } else {
    const jawharaSales = await prisma.jawharaSale.aggregate({
      where: { seasonId },
      _sum: { totalAmount: true },
    });
    creditTotal = jawharaSales._sum.totalAmount || 0;

    const jawharaPurchases = await prisma.jawharaPurchase.aggregate({
      where: { seasonId },
      _sum: { totalAmount: true },
    });
    const jawharaExpenses = await prisma.jawharaExpense.aggregate({
      where: { seasonId },
      _sum: { amount: true },
    });
    debitTotal = (jawharaPurchases._sum.totalAmount || 0) + (jawharaExpenses._sum.amount || 0);
  }

  const availableBalance = vault.initialCapital + creditTotal - debitTotal;

  return {
    vaultId: vault.id,
    seasonId,
    domain,
    vaultConstant: vault.initialCapital,
    creditTotal,
    debitTotal,
    availableBalance,
  };
}

export async function updateVaultCapital(id: number, initialCapital: number) {
  return prisma.vault.update({
    where: { id },
    data: { initialCapital },
  });
}
