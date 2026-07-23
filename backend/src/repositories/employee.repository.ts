import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import type { EmployeeInput } from '../validators/employee.validator.js';

export const employeeRepository = {
  create(data: EmployeeInput) {
    return prisma.employee.create({
      data: {
        employeeCode: data.employeeCode,
        name: data.name,
        mobile: data.mobile,
        aadhaar: data.aadhaar || null,
        designation: data.designation,
        salary: data.salary,
        joiningDate: new Date(data.joiningDate),
        siteId: data.siteId,
      },
      include: { site: { select: { id: true, name: true } } },
    });
  },

  update(id: string, data: EmployeeInput) {
    return prisma.employee.update({
      where: { id },
      data: {
        employeeCode: data.employeeCode,
        name: data.name,
        mobile: data.mobile,
        aadhaar: data.aadhaar || null,
        designation: data.designation,
        salary: data.salary,
        joiningDate: new Date(data.joiningDate),
        siteId: data.siteId,
      },
      include: { site: { select: { id: true, name: true } } },
    });
  },

  findById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: { site: { include: { client: { select: { id: true, companyName: true } } } } },
    });
  },

  findByCode(employeeCode: string) {
    return prisma.employee.findUnique({ where: { employeeCode } });
  },

  async findMany(params: {
    search?: string;
    siteId?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }) {
    const where: Prisma.EmployeeWhereInput = {
      ...(params.siteId ? { siteId: params.siteId } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { employeeCode: { contains: params.search } },
              { mobile: { contains: params.search } },
              { designation: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: { site: { select: { id: true, name: true } } },
      }),
      prisma.employee.count({ where }),
    ]);

    return { items, total };
  },

  transfer(id: string, siteId: string) {
    return prisma.employee.update({
      where: { id },
      data: { siteId },
      include: { site: { select: { id: true, name: true } } },
    });
  },

  disable(id: string) {
    return prisma.employee.update({
      where: { id },
      data: { isActive: false },
      include: { site: { select: { id: true, name: true } } },
    });
  },

  count(activeOnly = false) {
    return prisma.employee.count({
      where: activeOnly ? { isActive: true } : undefined,
    });
  },

  findActiveBySite(siteId: string) {
    return prisma.employee.findMany({
      where: { siteId, isActive: true },
      orderBy: { name: 'asc' },
    });
  },
};
