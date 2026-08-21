import { prisma } from '../../lib/prisma';
import { z } from 'zod';

export const employeeSchema = z.object({
  domain: z.enum(['WHITE_GOLD', 'AL_JAWHARA']),
  name: z.string().min(1, 'اسم الموظف مطلوب'),
  phone: z.string().optional(),
  jobTitle: z.string().min(1, 'المسمى الوظيفي مطلوب'),
  salary: z.number().min(0, 'الراتب مطلوب'),
  startDate: z.string(),
  isActive: z.boolean().default(true),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

export async function listEmployees(domain: 'WHITE_GOLD' | 'AL_JAWHARA') {
  return prisma.employee.findMany({
    where: { domain },
    orderBy: { startDate: 'desc' },
  });
}

export async function createEmployee(data: EmployeeInput) {
  return prisma.employee.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
    },
  });
}

export async function updateEmployee(id: number, data: Partial<EmployeeInput>) {
  return prisma.employee.update({
    where: { id },
    data: {
      ...data,
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
    },
  });
}

export async function deleteEmployee(id: number) {
  return prisma.employee.delete({ where: { id } });
}
