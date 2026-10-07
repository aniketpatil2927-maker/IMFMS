import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import type { EmployeeInput } from '../validators/employee.validator.js';

function encodeMetadata(data: EmployeeInput): string {
  const meta = {
    a: data.aadhaar,
    p: data.pan,
    b: data.bankName,
    ac: data.accountNumber,
    i: data.ifscCode,
    br: data.branch,
  };
  return JSON.stringify(meta);
}

function decodeEmployee<T extends { aadhaar: string | null }>(emp: T): T & {
  pan: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
} {
  if (!emp) return emp as never;
  let aadhaar = emp.aadhaar;
  let pan = '';
  let bankName = '';
  let accountNumber = '';
  let ifscCode = '';
  let branch = '';

  if (emp.aadhaar && emp.aadhaar.startsWith('{')) {
    try {
      const parsed = JSON.parse(emp.aadhaar);
      aadhaar = parsed.a || parsed.aadhaar || '';
      pan = parsed.p || parsed.pan || '';
      bankName = parsed.b || parsed.bankName || '';
      accountNumber = parsed.ac || parsed.accountNumber || '';
      ifscCode = parsed.i || parsed.ifscCode || '';
      branch = parsed.br || parsed.branch || '';
    } catch {
      // Keep plain text aadhaar
    }
  }

  return {
    ...emp,
    aadhaar,
    pan,
    bankName,
    accountNumber,
    ifscCode,
    branch,
  };
}

export const employeeRepository = {
  async create(data: EmployeeInput & { employeeCode: string }) {
    const created = await prisma.employee.create({
      data: {
        employeeCode: data.employeeCode,
        name: data.name,
        mobile: data.mobile,
        aadhaar: encodeMetadata(data),
        designation: data.designation,
        salary: data.salary,
        joiningDate: new Date(data.joiningDate),
        siteId: data.siteId,
      },
      include: { site: { select: { id: true, name: true } } },
    });
    return decodeEmployee(created);
  },

  async update(id: string, data: EmployeeInput & { employeeCode?: string }) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    const code = data.employeeCode || existing?.employeeCode || `EMP-${Date.now().toString().slice(-4)}`;
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        employeeCode: code,
        name: data.name,
        mobile: data.mobile,
        aadhaar: encodeMetadata(data),
        designation: data.designation,
        salary: data.salary,
        joiningDate: new Date(data.joiningDate),
        siteId: data.siteId,
      },
      include: { site: { select: { id: true, name: true } } },
    });
    return decodeEmployee(updated);
  },

  async findById(id: string) {
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: { site: { include: { client: { select: { id: true, companyName: true } } } } },
    });
    return emp ? decodeEmployee(emp) : null;
  },

  async findByCode(employeeCode: string) {
    const emp = await prisma.employee.findUnique({ where: { employeeCode } });
    return emp ? decodeEmployee(emp) : null;
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

    return { items: items.map(decodeEmployee), total };
  },

  async transfer(id: string, siteId: string) {
    const updated = await prisma.employee.update({
      where: { id },
      data: { siteId },
      include: { site: { select: { id: true, name: true } } },
    });
    return decodeEmployee(updated);
  },

  async disable(id: string) {
    const updated = await prisma.employee.update({
      where: { id },
      data: { isActive: false },
      include: { site: { select: { id: true, name: true } } },
    });
    return decodeEmployee(updated);
  },

  count(activeOnly = false) {
    return prisma.employee.count({
      where: activeOnly ? { isActive: true } : undefined,
    });
  },

  async findActiveBySite(siteId: string) {
    const emps = await prisma.employee.findMany({
      where: { siteId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return emps.map(decodeEmployee);
  },
};
