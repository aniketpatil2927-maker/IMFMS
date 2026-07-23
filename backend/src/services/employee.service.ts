import { employeeRepository } from '../repositories/employee.repository.js';
import { siteRepository } from '../repositories/site.repository.js';
import { AppError } from '../utils/AppError.js';
import type { EmployeeInput } from '../validators/employee.validator.js';

export const employeeService = {
  async create(data: EmployeeInput) {
    const site = await siteRepository.findById(data.siteId);
    if (!site) throw new AppError('Site not found', 404);

    const existing = await employeeRepository.findByCode(data.employeeCode);
    if (existing) throw new AppError('Employee ID already exists', 400);

    return employeeRepository.create(data);
  },

  async update(id: string, data: EmployeeInput) {
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new AppError('Employee not found', 404);

    const site = await siteRepository.findById(data.siteId);
    if (!site) throw new AppError('Site not found', 404);

    const codeOwner = await employeeRepository.findByCode(data.employeeCode);
    if (codeOwner && codeOwner.id !== id) {
      throw new AppError('Employee ID already exists', 400);
    }

    return employeeRepository.update(id, data);
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
