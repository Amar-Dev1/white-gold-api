import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const vaultAdjustmentSchema = z.object({
  date: z.string(),
  type: z.enum(['CREDIT', 'DEBIT']),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من 0'),
  reason: z.string().min(1, 'السبب والبيان مطلوب'),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export type VaultAdjustmentInput = z.infer<typeof vaultAdjustmentSchema>;

export async function getVaultSummary(domain: 'WHITE_GOLD' | 'AL_JAWHARA') {
  let vault = await prisma.vault.findUnique({
    where: { domain },
  });

  if (!vault) {
    vault = await prisma.vault.create({
      data: {
        domain,
        initialCapital: 0,
      },
    });
  }

  let creditTotal = 0;
  let debitTotal = 0;

  if (domain === 'WHITE_GOLD') {
    const cottonSales = await prisma.cottonSale.aggregate({
      _sum: { totalAmount: true },
    });
    const wasteSales = await prisma.wasteSale.aggregate({
      _sum: { totalAmount: true },
    });
    creditTotal = (cottonSales._sum.totalAmount || 0) + (wasteSales._sum.totalAmount || 0);

    const cottonPurchases = await prisma.cottonPurchase.aggregate({
      _sum: { totalAmount: true },
    });
    const packagingPurchases = await prisma.packagingPurchase.aggregate({
      _sum: { totalCost: true },
    });
    debitTotal = (cottonPurchases._sum.totalAmount || 0) + (packagingPurchases._sum.totalCost || 0);
  } else {
    const jawharaSales = await prisma.jawharaSale.aggregate({
      _sum: { totalAmount: true },
    });
    creditTotal = jawharaSales._sum.totalAmount || 0;

    const jawharaPurchases = await prisma.jawharaPurchase.aggregate({
      _sum: { totalAmount: true },
    });
    const jawharaExpenses = await prisma.jawharaExpense.aggregate({
      _sum: { amount: true },
    });
    debitTotal = (jawharaPurchases._sum.totalAmount || 0) + (jawharaExpenses._sum.amount || 0);
  }

  // Include Manual Vault Adjustments in totals
  const creditAdjustments = await prisma.vaultAdjustment.aggregate({
    where: { vaultId: vault.id, type: 'CREDIT' },
    _sum: { amount: true },
  });
  const debitAdjustments = await prisma.vaultAdjustment.aggregate({
    where: { vaultId: vault.id, type: 'DEBIT' },
    _sum: { amount: true },
  });

  creditTotal += creditAdjustments._sum.amount || 0;
  debitTotal += debitAdjustments._sum.amount || 0;

  const availableBalance = vault.initialCapital + creditTotal - debitTotal;

  return {
    vaultId: vault.id,
    domain,
    vaultConstant: vault.initialCapital,
    creditTotal,
    debitTotal,
    availableBalance,
  };
}

export async function updateVaultCapital(id: number, initialCapital: number) {
  const existing = await prisma.vault.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('VAULT_NOT_FOUND');
  }
  if (existing.initialCapital > 0) {
    throw new Error('CAPITAL_ALREADY_SET');
  }

  return prisma.vault.update({
    where: { id },
    data: { initialCapital },
  });
}

export async function emergencyOverrideVaultCapital(id: number, initialCapital: number) {
  const existing = await prisma.vault.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('VAULT_NOT_FOUND');
  }

  return prisma.vault.update({
    where: { id },
    data: { initialCapital },
  });
}

// Create Manual Vault Adjustment (تعديل الرصيد المتاح)
export async function createVaultAdjustment(vaultId: number, data: VaultAdjustmentInput) {
  const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
  if (!vault) {
    throw new Error('VAULT_NOT_FOUND');
  }

  return prisma.vaultAdjustment.create({
    data: {
      vaultId,
      date: new Date(data.date),
      type: data.type,
      amount: data.amount,
      reason: data.reason,
      referenceNo: data.referenceNo || null,
      notes: data.notes || null,
    },
  });
}

export async function deleteVaultAdjustment(id: number) {
  return prisma.vaultAdjustment.delete({ where: { id } });
}

interface VaultTransaction {
  id: string;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  source: string;
  amount: number;
  description: string;
  referenceNo: string;
  isManualAdjustment?: boolean;
  adjustmentId?: number;
}

export async function getVaultTransactions(
  domain: 'WHITE_GOLD' | 'AL_JAWHARA'
): Promise<VaultTransaction[]> {
  const transactions: VaultTransaction[] = [];

  const vault = await prisma.vault.findUnique({
    where: { domain },
  });

  if (domain === 'WHITE_GOLD') {
    // CREDIT: Cotton sales
    const cottonSales = await prisma.cottonSale.findMany({
      orderBy: { date: 'desc' },
    });
    for (const s of cottonSales) {
      transactions.push({
        id: `cs-${s.id}`,
        date: s.date.toISOString(),
        type: 'CREDIT',
        source: 'مبيعات قطن شعرة',
        amount: s.totalAmount,
        description: `${s.customerName} — ${s.quantity} بالة — Lot ${s.lotNumber}`,
        referenceNo: `CS-${s.id}`,
      });
    }

    // CREDIT: Waste sales
    const wasteSales = await prisma.wasteSale.findMany({
      orderBy: { date: 'desc' },
    });
    for (const w of wasteSales) {
      transactions.push({
        id: `ws-${w.id}`,
        date: w.date.toISOString(),
        type: 'CREDIT',
        source: 'مبيعات مخلفات حلج',
        amount: w.totalAmount,
        description: `${w.type} — ${w.quantity} وحدة`,
        referenceNo: `WS-${w.id}`,
      });
    }

    // DEBIT: Cotton purchases
    const cottonPurchases = await prisma.cottonPurchase.findMany({
      orderBy: { date: 'desc' },
    });
    for (const p of cottonPurchases) {
      transactions.push({
        id: `cp-${p.id}`,
        date: p.date.toISOString(),
        type: 'DEBIT',
        source: 'مشتريات خام القطن',
        amount: p.totalAmount,
        description: `${p.customerName} — ${p.sacksCount} جوال — لوحة ${p.truckPlateNumber}`,
        referenceNo: `CP-${p.id}`,
      });
    }

    // DEBIT: Packaging purchases
    const packagingPurchases = await prisma.packagingPurchase.findMany({
      orderBy: { date: 'desc' },
    });
    for (const pk of packagingPurchases) {
      transactions.push({
        id: `pp-${pk.id}`,
        date: pk.date.toISOString(),
        type: 'DEBIT',
        source: 'مشتريات أدوات تعبئة',
        amount: pk.totalCost,
        description: `${pk.type} — ${pk.quantity} وحدة`,
        referenceNo: `PP-${pk.id}`,
      });
    }
  } else {
    // AL_JAWHARA
    // CREDIT: Jawhara sales
    const jawharaSales = await prisma.jawharaSale.findMany({
      orderBy: { date: 'desc' },
    });
    const categoryLabels: Record<string, string> = {
      FEED: 'أمباز (علف)',
      OIL: 'زيت',
      WASTE: 'مخلفات عصر',
    };
    for (const s of jawharaSales) {
      transactions.push({
        id: `js-${s.id}`,
        date: s.date.toISOString(),
        type: 'CREDIT',
        source: `مبيعات ${categoryLabels[s.category] || s.category}`,
        amount: s.totalAmount,
        description: `${s.customerName} — ${s.quantity} وحدة`,
        referenceNo: `JS-${s.id}`,
      });
    }

    // DEBIT: Jawhara purchases
    const jawharaPurchases = await prisma.jawharaPurchase.findMany({
      orderBy: { date: 'desc' },
    });
    const purchaseCategoryLabels: Record<string, string> = {
      RAW: 'خام',
      PRODUCTION: 'إنتاج',
      OTHER: 'أخرى',
    };
    for (const p of jawharaPurchases) {
      transactions.push({
        id: `jp-${p.id}`,
        date: p.date.toISOString(),
        type: 'DEBIT',
        source: `مشتريات ${purchaseCategoryLabels[p.category] || p.category}`,
        amount: p.totalAmount,
        description: `${p.customerName} — ${p.sacksCount} جوال — لوحة ${p.truckPlateNumber}`,
        referenceNo: `JP-${p.id}`,
      });
    }

    // DEBIT: Jawhara expenses
    const jawharaExpenses = await prisma.jawharaExpense.findMany({
      orderBy: { date: 'desc' },
    });
    for (const ex of jawharaExpenses) {
      transactions.push({
        id: `je-${ex.id}`,
        date: ex.date.toISOString(),
        type: 'DEBIT',
        source: ex.category === 'OPERATIONS' ? 'منصرفات تشغيل' : 'منصرفات أخرى',
        amount: ex.amount,
        description: ex.description,
        referenceNo: `JE-${ex.id}`,
      });
    }
  }

  // Include Manual Vault Adjustments if vault exists
  if (vault) {
    const adjustments = await prisma.vaultAdjustment.findMany({
      where: { vaultId: vault.id },
      orderBy: { date: 'desc' },
    });

    for (const adj of adjustments) {
      transactions.push({
        id: `adj-${adj.id}`,
        date: adj.date.toISOString(),
        type: adj.type as 'CREDIT' | 'DEBIT',
        source: 'تعديل الرصيد المتاح (قيد يدوي)',
        amount: adj.amount,
        description: `${adj.reason}${adj.notes ? ` — ${adj.notes}` : ''}`,
        referenceNo: adj.referenceNo || `ADJ-${adj.id}`,
        isManualAdjustment: true,
        adjustmentId: adj.id,
      });
    }
  }

  // Sort all transactions by date descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return transactions;
}
