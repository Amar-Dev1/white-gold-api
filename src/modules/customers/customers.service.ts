import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const customerSchema = z.object({
  domain: z.enum(['WHITE_GOLD', 'AL_JAWHARA']),
  name: z.string().min(1, 'اسم العميل مطلوب'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const customerContractSchema = z.object({
  customerId: z.number().int().positive(),
  productType: z.enum(['OIL', 'FEED']),
  agreedQuantity: z.number().positive('الكمية المتفق عليها يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().positive('سعر الوحدة يجب أن يكون أكبر من صفر'),
  totalAgreedPrice: z.number().positive('إجمالي السعر المتفق عليه يجب أن يكون أكبر من صفر'),
  unit: z.string().optional().default('جالون'),
  notes: z.string().optional().nullable(),
});

export const customerTransactionSchema = z.object({
  contractId: z.number().int().positive(),
  date: z.string(),
  takenQuantity: z.number().positive('الكمية المستلمة يجب أن تكون أكبر من صفر'),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerContractInput = z.infer<typeof customerContractSchema>;
export type CustomerTransactionInput = z.infer<typeof customerTransactionSchema>;

// Customers CRUD
export async function listCustomers(domain: 'WHITE_GOLD' | 'AL_JAWHARA') {
  return prisma.customer.findMany({
    where: { domain },
    include: {
      contracts: {
        include: {
          transactions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCustomerById(id: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contracts: {
        include: {
          transactions: {
            orderBy: { date: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) return null;

  // Process summary statistics for each contract
  const processedContracts = customer.contracts.map((contract) => {
    let totalTaken = 0;
    let totalPaid = 0;

    // Calculate running balances for transactions
    const chronologicalTx = [...contract.transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningTaken = 0;
    const transactionsWithBalance = chronologicalTx.map((tx) => {
      runningTaken += tx.takenQuantity;
      const restQty = Math.max(0, contract.agreedQuantity - runningTaken);
      const restPrice = Math.max(0, restQty * contract.unitPrice);
      const calcedAmountPaid = tx.amountPaid > 0 ? tx.amountPaid : tx.takenQuantity * contract.unitPrice;

      return {
        ...tx,
        customerName: customer.name,
        contractId: contract.id,
        contractDate: contract.createdAt,
        contractNotes: contract.notes,
        agreedQuantity: contract.agreedQuantity,
        agreedPrice: contract.totalAgreedPrice,
        unitPrice: contract.unitPrice,
        unit: contract.unit,
        amountPaid: calcedAmountPaid,
        remainingQuantity: restQty,
        remainingPrice: restPrice,
      };
    }).reverse(); // Most recent first for display

    for (const tx of contract.transactions) {
      totalTaken += tx.takenQuantity;
      totalPaid += tx.amountPaid > 0 ? tx.amountPaid : tx.takenQuantity * contract.unitPrice;
    }

    const remainingQuantity = Math.max(0, contract.agreedQuantity - totalTaken);
    const remainingPrice = Math.max(0, remainingQuantity * contract.unitPrice);

    return {
      ...contract,
      customerName: customer.name,
      totalTakenQuantity: totalTaken,
      totalPaidAmount: totalPaid,
      remainingQuantity,
      remainingPrice,
      isCompleted: remainingQuantity <= 0,
      transactions: transactionsWithBalance,
    };
  });

  return {
    ...customer,
    contracts: processedContracts,
  };
}

export async function createCustomer(data: CustomerInput) {
  return prisma.customer.create({ data });
}

export async function updateCustomer(id: number, data: Partial<CustomerInput>) {
  return prisma.customer.update({
    where: { id },
    data,
  });
}

export async function deleteCustomer(id: number) {
  return prisma.customer.delete({ where: { id } });
}

// Contracts CRUD
export async function createContract(data: CustomerContractInput) {
  return prisma.customerContract.create({
    data: {
      customerId: data.customerId,
      productType: data.productType,
      agreedQuantity: data.agreedQuantity,
      unitPrice: data.unitPrice,
      totalAgreedPrice: data.totalAgreedPrice,
      unit: data.unit || (data.productType === 'OIL' ? 'جالون' : 'جوال'),
      notes: data.notes,
    },
  });
}

export async function updateContract(id: number, data: Partial<CustomerContractInput>) {
  return prisma.customerContract.update({
    where: { id },
    data,
  });
}

export async function deleteContract(id: number) {
  return prisma.customerContract.delete({ where: { id } });
}

// Transactions CRUD
export async function createTransaction(data: CustomerTransactionInput) {
  const contract = await prisma.customerContract.findUnique({
    where: { id: data.contractId },
    include: { transactions: true },
  });

  if (!contract) {
    throw new Error('الاتفاقية المحددة غير موجودة');
  }

  const currentTaken = contract.transactions.reduce((acc, t) => acc + t.takenQuantity, 0);
  const currentRemaining = contract.agreedQuantity - currentTaken;

  if (currentRemaining <= 0) {
    throw new Error(`الاتفاقية مكتملة الاستلام بالكامل (${contract.agreedQuantity} ${contract.unit})، لا يمكن تسجيل سحوبات إضافية`);
  }

  if (data.takenQuantity > currentRemaining) {
    throw new Error(`الكمية المطلوبة للسحب (${data.takenQuantity} ${contract.unit}) تتجاوز الكمية المتبقية المتاحة في الاتفاقية (${currentRemaining} ${contract.unit})`);
  }

  return prisma.customerTransaction.create({
    data: {
      contractId: data.contractId,
      date: new Date(data.date),
      takenQuantity: data.takenQuantity,
      amountPaid: data.amountPaid || 0,
      notes: data.notes,
    },
  });
}

export async function updateTransaction(id: number, data: Partial<CustomerTransactionInput>) {
  const existing = await prisma.customerTransaction.findUnique({
    where: { id },
    include: {
      contract: {
        include: { transactions: true },
      },
    },
  });

  if (!existing) {
    throw new Error('المعاملة غير موجودة');
  }

  if (data.takenQuantity !== undefined && data.takenQuantity !== existing.takenQuantity) {
    const otherTaken = existing.contract.transactions
      .filter((t) => t.id !== id)
      .reduce((acc, t) => acc + t.takenQuantity, 0);
    const available = existing.contract.agreedQuantity - otherTaken;

    if (data.takenQuantity > available) {
      throw new Error(`الكمية المعدلة (${data.takenQuantity}) تتجاوز الكمية المتاحة في العقد (${available})`);
    }
  }

  return prisma.customerTransaction.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });
}

export async function deleteTransaction(id: number) {
  return prisma.customerTransaction.delete({ where: { id } });
}

