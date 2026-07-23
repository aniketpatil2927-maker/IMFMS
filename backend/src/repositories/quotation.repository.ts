import type { DocumentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const quotationInclude = {
  client: { select: { id: true, companyName: true, address: true, gstNumber: true, contactPerson: true, mobile: true } },
  site: { select: { id: true, name: true, address: true } },
  items: true,
} satisfies Prisma.QuotationInclude;

export const quotationRepository = {
  create(data: Prisma.QuotationCreateInput) {
    return prisma.quotation.create({ data, include: quotationInclude });
  },

  update(id: string, data: Prisma.QuotationUpdateInput) {
    return prisma.quotation.update({ where: { id }, data, include: quotationInclude });
  },

  findById(id: string) {
    return prisma.quotation.findUnique({ where: { id }, include: quotationInclude });
  },

  async findMany(params: {
    search?: string;
    clientId?: string;
    status?: DocumentStatus;
    page: number;
    limit: number;
  }) {
    const where: Prisma.QuotationWhereInput = {
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { quotationNumber: { contains: params.search } },
              { client: { companyName: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          client: { select: { id: true, companyName: true } },
          site: { select: { id: true, name: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return { items, total };
  },

  delete(id: string) {
    return prisma.quotation.delete({ where: { id } });
  },

  countPending() {
    return prisma.quotation.count({
      where: { status: { in: ['DRAFT', 'PENDING'] } },
    });
  },
};
