import { expenseRepository, type ExpenseRecord } from '../repositories/expense.repository.js';
import type { ExpenseCreateInput, ExpenseQueryInput, ExpenseUpdateInput } from '../validators/expense.validator.js';
import { buildGenericExcel } from '../utils/excel.js';
import { buildGenericPdfTable } from '../utils/pdf.js';
import { format } from 'date-fns';

export const expenseService = {
  async create(data: ExpenseCreateInput): Promise<ExpenseRecord> {
    return expenseRepository.create({
      date: data.date,
      category: data.category,
      title: data.title,
      amount: data.amount,
      siteId: data.siteId,
      employeeId: data.employeeId,
      paymentMode: data.paymentMode,
      vendorName: data.vendorName,
      referenceNumber: data.referenceNumber,
      status: data.status,
      notes: data.notes,
    });
  },

  async update(id: string, data: ExpenseUpdateInput): Promise<ExpenseRecord> {
    return expenseRepository.update(id, data);
  },

  async getById(id: string): Promise<ExpenseRecord | null> {
    return expenseRepository.findById(id);
  },

  async delete(id: string): Promise<void> {
    return expenseRepository.delete(id);
  },

  async list(query: ExpenseQueryInput) {
    const { items, total } = await expenseRepository.findMany({
      search: query.search,
      category: query.category,
      siteId: query.siteId,
      employeeId: query.employeeId,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  },

  async summary(query?: { siteId?: string; from?: string; to?: string }) {
    return expenseRepository.getSummary(query);
  },

  async buildExcel(query: Partial<ExpenseQueryInput>): Promise<Buffer> {
    const { items } = await expenseRepository.findMany({
      search: query.search,
      category: query.category,
      siteId: query.siteId,
      employeeId: query.employeeId,
      from: query.from,
      to: query.to,
      page: 1,
      limit: 10000,
    });

    const columns = [
      { header: 'Voucher No', key: 'number', width: 16 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Expense Title / Description', key: 'title', width: 32 },
      { header: 'Facility Site', key: 'site', width: 24 },
      { header: 'Staff / Recipient', key: 'employee', width: 22 },
      { header: 'Vendor / Supplier', key: 'vendor', width: 22 },
      { header: 'Payment Mode', key: 'mode', width: 16 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Ref / Bill No', key: 'ref', width: 16 },
      { header: 'Notes', key: 'notes', width: 26 },
    ];

    const rows = items.map((e) => ({
      number: e.expenseNumber,
      date: e.date,
      category: e.category,
      title: e.title,
      site: e.site?.name || '-',
      employee: e.employee ? `${e.employee.name} (${e.employee.employeeCode})` : '-',
      vendor: e.vendorName || '-',
      mode: e.paymentMode,
      amount: Number(e.amount),
      ref: e.referenceNumber || '-',
      notes: e.notes || '-',
    }));

    return buildGenericExcel('Operational Expenses', columns, rows);
  },

  async buildPdf(query: Partial<ExpenseQueryInput>): Promise<Buffer> {
    const { items } = await expenseRepository.findMany({
      search: query.search,
      category: query.category,
      siteId: query.siteId,
      employeeId: query.employeeId,
      from: query.from,
      to: query.to,
      page: 1,
      limit: 10000,
    });

    const columns = [
      { header: 'Voucher', key: 'number', width: 75 },
      { header: 'Date', key: 'date', width: 65 },
      { header: 'Category', key: 'category', width: 70 },
      { header: 'Title / Particulars', key: 'title', width: 180 },
      { header: 'Site / Staff', key: 'target', width: 130 },
      { header: 'Payment Mode', key: 'mode', width: 85 },
      { header: 'Amount (₹)', key: 'amount', width: 85 },
    ];

    const totalAmt = items.reduce((acc, curr) => acc + curr.amount, 0);

    const rows = items.map((e) => ({
      number: e.expenseNumber,
      date: format(new Date(e.date), 'dd/MM/yyyy'),
      category: e.category,
      title: e.title,
      target: e.employee ? `${e.employee.name}` : e.site ? `${e.site.name}` : '-',
      mode: e.paymentMode,
      amount: e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    }));

    return buildGenericPdfTable({
      title: 'OPERATIONAL EXPENSES REGISTER',
      subtitle: `Total Records: ${items.length}  |  Total Outflow: ₹ ${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      columns,
      rows,
    });
  },
};
