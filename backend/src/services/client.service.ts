import { clientRepository } from '../repositories/client.repository.js';
import { AppError } from '../utils/AppError.js';
import type { ClientInput } from '../validators/client.validator.js';

export const clientService = {
  async create(data: ClientInput) {
    return clientRepository.create(data);
  },

  async update(id: string, data: ClientInput) {
    const existing = await clientRepository.findById(id);
    if (!existing) throw new AppError('Client not found', 404);
    return clientRepository.update(id, data);
  },

  async getById(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new AppError('Client not found', 404);
    return client;
  },

  async list(params: { search?: string; page: number; limit: number }) {
    const { items, total } = await clientRepository.findMany(params);
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
    const client = await clientRepository.findById(id);
    if (!client) throw new AppError('Client not found', 404);
    if (client._count.sites > 0 || client._count.quotations > 0 || client._count.invoices > 0) {
      throw new AppError('Cannot delete client with linked sites, quotations, or invoices', 400);
    }
    await clientRepository.delete(id);
    return { message: 'Client deleted' };
  },
};
