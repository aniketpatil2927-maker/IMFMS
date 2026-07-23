import { format } from 'date-fns';
import { prisma } from '../config/database.js';
import { billRepository } from '../repositories/bill.repository.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { AppError } from '../utils/AppError.js';
import { calcGst, nextDocumentNumber, toNumber } from '../utils/documentNumber.js';
import type { BillGenerateInput } from '../validators/bill.validator.js';

export const billService = {
  async generate(input: BillGenerateInput) {
    const invoice = await invoiceRepository.findById(input.invoiceId);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const distinct = await attendanceRepository.countDistinctEmployeesInMonth(
      invoice.siteId,
      input.attendanceYear,
      input.attendanceMonth,
    );

    const amount = toNumber(invoice.subtotal);
    const gstPercent = input.gstPercent ?? toNumber(invoice.gstPercent);
    const { gstAmount, total: grandTotal } = calcGst(amount, gstPercent);
    const billingMonth = format(
      new Date(Date.UTC(input.attendanceYear, input.attendanceMonth - 1, 1)),
      'MMMM yyyy',
    );

    return prisma.$transaction(async (tx) => {
      const billNumber = await nextDocumentNumber('BILL', tx);
      return tx.bill.create({
        data: {
          billNumber,
          invoiceId: invoice.id,
          billingMonth,
          attendanceYear: input.attendanceYear,
          attendanceMonth: input.attendanceMonth,
          totalEmployees: distinct.length,
          amount,
          gstPercent,
          gstAmount,
          grandTotal,
        },
        include: {
          invoice: {
            include: {
              client: true,
              site: true,
            },
          },
        },
      });
    });
  },

  async getById(id: string) {
    const bill = await billRepository.findById(id);
    if (!bill) throw new AppError('Bill not found', 404);
    return bill;
  },

  async list(params: { search?: string; page: number; limit: number }) {
    const { items, total } = await billRepository.findMany(params);
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
};
