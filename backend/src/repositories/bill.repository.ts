import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const billInclude = {
  invoice: {
    include: {
      client: { select: { id: true, companyName: true, address: true, gstNumber: true } },
      site: { select: { id: true, name: true, address: true } },
    },
  },
} satisfies Prisma.BillInclude;

export const billRepository = {
  create(data: Prisma.BillCreateInput) {
    return prisma.bill.create({ data, include: billInclude });
  },

  findById(id: string) {
    return prisma.bill.findUnique({ where: { id }, include: billInclude });
  },

  async findMany(params: { search?: string; page: number; limit: number }) {
    const where: Prisma.BillWhereInput = params.search
      ? {
          OR: [
            { billNumber: { contains: params.search } },
            { billingMonth: { contains: params.search } },
            { invoice: { invoiceNumber: { contains: params.search } } },
            { invoice: { client: { companyName: { contains: params.search } } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              client: { select: { id: true, companyName: true } },
              site: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.bill.count({ where }),
    ]);

    return { items, total };
  },
};
