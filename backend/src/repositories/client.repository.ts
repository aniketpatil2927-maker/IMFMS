import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import type { ClientInput } from '../validators/client.validator.js';

export const clientRepository = {
  create(data: ClientInput) {
    return prisma.client.create({
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        mobile: data.mobile,
        email: data.email || null,
        gstNumber: data.gstNumber || null,
        address: data.address,
      },
    });
  },

  update(id: string, data: ClientInput) {
    return prisma.client.update({
      where: { id },
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        mobile: data.mobile,
        email: data.email || null,
        gstNumber: data.gstNumber || null,
        address: data.address,
      },
    });
  },

  findById(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: { sites: true, _count: { select: { sites: true, quotations: true, invoices: true } } },
    });
  },

  async findMany(params: { search?: string; page: number; limit: number }) {
    const where: Prisma.ClientWhereInput = params.search
      ? {
          OR: [
            { companyName: { contains: params.search } },
            { contactPerson: { contains: params.search } },
            { mobile: { contains: params.search } },
            { email: { contains: params.search } },
            { gstNumber: { contains: params.search } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: { _count: { select: { sites: true } } },
      }),
      prisma.client.count({ where }),
    ]);

    return { items, total };
  },

  delete(id: string) {
    return prisma.client.delete({ where: { id } });
  },

  count() {
    return prisma.client.count();
  },
};
