import { prisma } from '../config/database.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import { siteRepository } from '../repositories/site.repository.js';
import { AppError } from '../utils/AppError.js';
import type { EmployeeInput } from '../validators/employee.validator.js';

export const employeeService = {
  async create(data: EmployeeInput) {
    const site = await siteRepository.findById(data.siteId);
    if (!site) throw new AppError('Site not found', 404);

    let code = data.employeeCode?.trim();
    if (!code) {
      const count = await prisma.employee.count();
      code = `EMP-${String(count + 1).padStart(3, '0')}`;
      let existingCode = await employeeRepository.findByCode(code);
      let suffix = 1;
      while (existingCode) {
        code = `EMP-${String(count + 1 + suffix).padStart(3, '0')}`;
        existingCode = await employeeRepository.findByCode(code);
        suffix++;
      }
    } else {
      const existing = await employeeRepository.findByCode(code);
      if (existing) throw new AppError('Employee ID already exists', 400);
    }

    return employeeRepository.create({ ...data, employeeCode: code });
  },

  async update(id: string, data: EmployeeInput) {
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);

    const site = await siteRepository.findById(data.siteId);
    if (!site) throw new AppError('Site not found', 404);

    const code = data.employeeCode?.trim() || existing.employeeCode;
    if (code) {
      const codeOwner = await employeeRepository.findByCode(code);
      if (codeOwner && codeOwner.id !== id) {
        throw new AppError('Employee ID already exists', 400);
      }
    }

    return employeeRepository.update(id, { ...data, employeeCode: code });
  },

  async getById(id: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  },

  async list(params: {
    search?: string;
    siteId?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }) {
    const { items, total } = await employeeRepository.findMany(params);
    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit) || 1,
      },
    };
  },

  async transfer(id: string, siteId: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) throw new AppError('Employee not found', 404);
    if (!employee.isActive) throw new AppError('Cannot transfer a disabled employee', 400);

    const site = await siteRepository.findById(siteId);
    if (!site) throw new AppError('Site not found', 404);

    return employeeRepository.transfer(id, siteId);
  },

  async disable(id: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) throw new AppError('Employee not found', 404);
    if (!employee.isActive) throw new AppError('Employee is already disabled', 400);
    return employeeRepository.disable(id);
  },
};
