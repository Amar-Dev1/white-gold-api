import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const jawharaExpenseSchema = z.object({
  category: z.enum(['OPERATIONS', 'OTHER']),
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().min(0),
  notes: z.string().optional(),
});

export type JawharaExpenseInput = z.infer<typeof jawharaExpenseSchema>;

export async function listJawharaExpenses(category?: string) {
  return prisma.jawharaExpense.findMany({
    where: {
      ...(category ? { category } : {}),
    },
    orderBy: { date: 'desc' },
  });
}

export async function createJawharaExpense(data: JawharaExpenseInput) {
  return prisma.jawharaExpense.create({
    data: {
      ...data,
      date: new Date(data.date),
    },
  });
}

export async function updateJawharaExpense(id: number, data: Partial<JawharaExpenseInput>) {
  return prisma.jawharaExpense.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });
}

export async function deleteJawharaExpense(id: number) {
  return prisma.jawharaExpense.delete({ where: { id } });
}
