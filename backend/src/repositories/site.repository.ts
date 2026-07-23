import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import type { SiteInput } from '../validators/site.validator.js';

export const siteRepository = {
  create(data: SiteInput) {
    return prisma.site.create({
      data,
      include: { client: { select: { id: true, companyName: true } } },
    });
  },

  update(id: string, data: SiteInput) {
    return prisma.site.update({
      where: { id },
      data,
      include: { client: { select: { id: true, companyName: true } } },
    });
  },

  findById(id: string) {
    return prisma.site.findUnique({
      where: { id },
      include: {
        client: true,
        _count: { select: { employees: true } },
      },
    });
  },

  async findMany(params: {
    search?: string;
    clientId?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.SiteWhereInput = {
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { supervisorName: { contains: params.search } },
              { contactNumber: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.site.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          client: { select: { id: true, companyName: true } },
          _count: { select: { employees: true } },
        },
      }),
      prisma.site.count({ where }),
    ]);

    return { items, total };
  },

  delete(id: string) {
    return prisma.site.delete({ where: { id } });
  },

  count() {
    return prisma.site.count();
  },

  findAllLite(clientId?: string) {
    return prisma.site.findMany({
      where: clientId ? { clientId } : undefined,
      select: { id: true, name: true, clientId: true },
      orderBy: { name: 'asc' },
    });
  },
};
