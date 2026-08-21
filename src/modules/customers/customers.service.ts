import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const customerSchema = z.object({
  domain: z.enum(['WHITE_GOLD', 'AL_JAWHARA']),
  name: z.string().min(1, 'اسم العميل مطلوب'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export async function listCustomers(domain: 'WHITE_GOLD' | 'AL_JAWHARA') {
  return prisma.customer.findMany({
    where: { domain },
    orderBy: { createdAt: 'desc' },
  });
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
