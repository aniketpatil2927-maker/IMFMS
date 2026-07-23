import { siteRepository } from '../repositories/site.repository.js';
import { clientRepository } from '../repositories/client.repository.js';
import { AppError } from '../utils/AppError.js';
import type { SiteInput } from '../validators/site.validator.js';

export const siteService = {
  async create(data: SiteInput) {
    const client = await clientRepository.findById(data.clientId);
    if (!client) throw new AppError('Client not found', 404);
    return siteRepository.create(data);
  },

  async update(id: string, data: SiteInput) {
    const existing = await siteRepository.findById(id);
    if (!existing) throw new AppError('Site not found', 404);
    const client = await clientRepository.findById(data.clientId);
    if (!client) throw new AppError('Client not found', 404);
    return siteRepository.update(id, data);
  },

  async getById(id: string) {
    const site = await siteRepository.findById(id);
    if (!site) throw new AppError('Site not found', 404);
    return site;
  },

  async list(params: { search?: string; clientId?: string; page: number; limit: number }) {
    const { items, total } = await siteRepository.findMany(params);
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

  async remove(id: string) {
    const site = await siteRepository.findById(id);
    if (!site) throw new AppError('Site not found', 404);
    if (site._count.employees > 0) {
      throw new AppError('Cannot delete site with assigned employees', 400);
    }
    await siteRepository.delete(id);
    return { message: 'Site deleted' };
  },

  listLite(clientId?: string) {
    return siteRepository.findAllLite(clientId);
  },
};
