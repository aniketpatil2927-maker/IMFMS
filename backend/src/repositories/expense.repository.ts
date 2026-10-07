import { randomUUID } from 'crypto';
import { prisma } from '../config/database.js';

export interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  date: string;
  category: 'MATERIAL' | 'UNIFORM' | 'ADVANCE' | 'OTHER';
  title: string;
  amount: number;
  siteId: string | null;
  employeeId: string | null;
  paymentMode: string;
  vendorName: string | null;
  referenceNumber: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string } | null;
  employee?: { id: string; employeeCode: string; name: string } | null;
}

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`expenses\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`expense_number\` VARCHAR(191) NOT NULL UNIQUE,
        \`date\` DATE NOT NULL,
        \`category\` VARCHAR(50) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(12, 2) NOT NULL,
        \`site_id\` VARCHAR(191) NULL,
        \`employee_id\` VARCHAR(191) NULL,
        \`payment_mode\` VARCHAR(50) NOT NULL DEFAULT 'CASH',
        \`vendor_name\` VARCHAR(191) NULL,
        \`reference_number\` VARCHAR(191) NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'PAID',
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`idx_expenses_category\` (\`category\`),
        INDEX \`idx_expenses_site_id\` (\`site_id\`),
        INDEX \`idx_expenses_employee_id\` (\`employee_id\`),
        INDEX \`idx_expenses_date\` (\`date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check count and seed initial realistic expenses if empty
    const countRows = (await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      'SELECT COUNT(*) as count FROM `expenses`',
    )) as Array<{ count: bigint | number }>;

    const totalCount = Number(countRows[0]?.count ?? 0);
    if (totalCount === 0) {
      // Find a default site and employees to link
      const sites = await prisma.site.findMany({ take: 2, select: { id: true, name: true } });
      const employees = await prisma.employee.findMany({ take: 3, select: { id: true, name: true } });

      const siteId = sites[0]?.id || null;
      const emp1 = employees[0]?.id || null;
      const emp2 = employees[1]?.id || null;

      const year = new Date().getFullYear();
      const samples = [
        {
          id: randomUUID(),
          number: `EXP-${year}-0001`,
          date: new Date().toISOString().slice(0, 10),
          category: 'MATERIAL',
          title: 'Housekeeping Cleaning Chemicals & Disinfectant Bulk (50 Liters)',
          amount: 8450,
          siteId,
          empId: null,
          mode: 'ONLINE',
          vendor: 'CleanTech Facility Supplies',
          ref: 'BILL-CT-892',
          notes: 'Floor cleaners, glass sprays, and room deodorizers for monthly maintenance.',
        },
        {
          id: randomUUID(),
          number: `EXP-${year}-0002`,
          date: new Date().toISOString().slice(0, 10),
          category: 'UNIFORM',
          title: 'Staff Uniform Sets (12 Pairs Navy Blue) & ID Badge Lanyards',
          amount: 14200,
          siteId,
          empId: null,
          mode: 'BANK_TRANSFER',
          vendor: 'Shree Garments & Corporate Wear',
          ref: 'INV-SG-441',
          notes: 'Standardized housekeeping polo uniforms and safety name tags.',
        },
        {
          id: randomUUID(),
          number: `EXP-${year}-0003`,
          date: new Date().toISOString().slice(0, 10),
          category: 'ADVANCE',
          title: 'Staff Salary Advance - Emergency Family Medical Assistance',
          amount: 5000,
          siteId,
          empId: emp1,
          mode: 'UPI',
          vendor: employees[0]?.name || 'Housekeeping Staff Member',
          ref: 'UPI-ADV-90234',
          notes: 'Deductible across 2 equal monthly payroll disbursements.',
        },
        {
          id: randomUUID(),
          number: `EXP-${year}-0004`,
          date: new Date().toISOString().slice(0, 10),
          category: 'MATERIAL',
          title: 'Heavy-Duty Mops, Buckets, Squeegees & Garbage Bags (Pack of 500)',
          amount: 4800,
          siteId,
          empId: null,
          mode: 'CASH',
          vendor: 'Metro Facility Mart',
          ref: 'CASH-VOUCH-102',
          notes: 'Wet/dry mops and biodegradable waste disposal bags.',
        },
        {
          id: randomUUID(),
          number: `EXP-${year}-0005`,
          date: new Date().toISOString().slice(0, 10),
          category: 'ADVANCE',
          title: 'Festival Advance Payment - Housekeeping Attendant',
          amount: 3000,
          siteId,
          empId: emp2,
          mode: 'CASH',
          vendor: employees[1]?.name || 'Housekeeping Attendant',
          ref: 'ADV-VOUCH-105',
          notes: 'Approved festival advance to be adjusted against next salary.',
        },
        {
          id: randomUUID(),
          number: `EXP-${year}-0006`,
          date: new Date().toISOString().slice(0, 10),
          category: 'UNIFORM',
          title: 'Safety Rubber Boots & Heavy-Duty Nitrile Gloves (8 Pairs)',
          amount: 6500,
          siteId,
          empId: null,
          mode: 'ONLINE',
          vendor: 'SafeGuard Industrial Equipment',
          ref: 'INV-SAFE-712',
          notes: 'Non-slip safety shoes for wet cleaning areas.',
        },
      ];

      for (const s of samples) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO \`expenses\` 
          (\`id\`, \`expense_number\`, \`date\`, \`category\`, \`title\`, \`amount\`, \`site_id\`, \`employee_id\`, \`payment_mode\`, \`vendor_name\`, \`reference_number\`, \`status\`, \`notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?)`,
          s.id,
          s.number,
          s.date,
          s.category,
          s.title,
          s.amount,
          s.siteId,
          s.empId,
          s.mode,
          s.vendor,
          s.ref,
          s.notes,
        );
      }
    }
  } catch (e) {
    console.error('Error ensuring expenses table:', e);
  } finally {
    tableReady = true;
  }
}

function mapRow(row: any): ExpenseRecord {
  return {
    id: row.id,
    expenseNumber: row.expense_number,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10),
    category: row.category,
    title: row.title,
    amount: Number(row.amount),
    siteId: row.site_id || null,
    employeeId: row.employee_id || null,
    paymentMode: row.payment_mode || 'CASH',
    vendorName: row.vendor_name || null,
    referenceNumber: row.reference_number || null,
    status: row.status || 'PAID',
    notes: row.notes || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    site: row.site_id && row.site_name ? { id: row.site_id, name: row.site_name } : null,
    employee:
      row.employee_id && row.emp_name
        ? { id: row.employee_id, employeeCode: row.emp_code || '', name: row.emp_name }
        : null,
  };
}

export const expenseRepository = {
  async ensureTable() {
    await ensureTable();
  },

  async nextNumber(): Promise<string> {
    await ensureTable();
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;
    const rows = (await prisma.$queryRawUnsafe<Array<{ expense_number: string }>>(
      'SELECT expense_number FROM `expenses` WHERE expense_number LIKE ? ORDER BY expense_number DESC LIMIT 1',
      `${prefix}%`,
    )) as Array<{ expense_number: string }>;

    let lastNum = 0;
    if (rows[0]?.expense_number) {
      const parts = rows[0].expense_number.split('-');
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed)) lastNum = parsed;
    }
    return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
  },

  async create(data: {
    date: string;
    category: string;
    title: string;
    amount: number;
    siteId?: string | null;
    employeeId?: string | null;
    paymentMode?: string;
    vendorName?: string | null;
    referenceNumber?: string | null;
    status?: string;
    notes?: string | null;
  }): Promise<ExpenseRecord> {
    await ensureTable();
    const id = randomUUID();
    const expenseNumber = await this.nextNumber();
    const siteId = data.siteId?.trim() || null;
    const employeeId = data.employeeId?.trim() || null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`expenses\`
      (\`id\`, \`expense_number\`, \`date\`, \`category\`, \`title\`, \`amount\`, \`site_id\`, \`employee_id\`, \`payment_mode\`, \`vendor_name\`, \`reference_number\`, \`status\`, \`notes\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      expenseNumber,
      data.date.slice(0, 10),
      data.category,
      data.title,
      data.amount,
      siteId,
      employeeId,
      data.paymentMode || 'CASH',
      data.vendorName || null,
      data.referenceNumber || null,
      data.status || 'PAID',
      data.notes || null,
    );

    const created = await this.findById(id);
    return created!;
  },

  async findById(id: string): Promise<ExpenseRecord | null> {
    await ensureTable();
    const rows = (await prisma.$queryRawUnsafe<any[]>(
      `SELECT e.*, s.name as site_name, emp.name as emp_name, emp.employee_code as emp_code
       FROM \`expenses\` e
       LEFT JOIN \`sites\` s ON e.site_id = s.id
       LEFT JOIN \`employees\` emp ON e.employee_id = emp.id
       WHERE e.id = ? LIMIT 1`,
      id,
    )) as any[];

    if (!rows[0]) return null;
    return mapRow(rows[0]);
  },

  async update(
    id: string,
    data: Partial<{
      date: string;
      category: string;
      title: string;
      amount: number;
      siteId: string | null;
      employeeId: string | null;
      paymentMode: string;
      vendorName: string | null;
      referenceNumber: string | null;
      status: string;
      notes: string | null;
    }>,
  ): Promise<ExpenseRecord> {
    await ensureTable();
    const existing = await this.findById(id);
    if (!existing) throw new Error('Expense record not found');

    const fields: string[] = [];
    const values: any[] = [];

    if (data.date !== undefined) {
      fields.push('`date` = ?');
      values.push(data.date.slice(0, 10));
    }
    if (data.category !== undefined) {
      fields.push('`category` = ?');
      values.push(data.category);
    }
    if (data.title !== undefined) {
      fields.push('`title` = ?');
      values.push(data.title);
    }
    if (data.amount !== undefined) {
      fields.push('`amount` = ?');
      values.push(data.amount);
    }
    if (data.siteId !== undefined) {
      fields.push('`site_id` = ?');
      values.push(data.siteId?.trim() || null);
    }
    if (data.employeeId !== undefined) {
      fields.push('`employee_id` = ?');
      values.push(data.employeeId?.trim() || null);
    }
    if (data.paymentMode !== undefined) {
      fields.push('`payment_mode` = ?');
      values.push(data.paymentMode);
    }
    if (data.vendorName !== undefined) {
      fields.push('`vendor_name` = ?');
      values.push(data.vendorName || null);
    }
    if (data.referenceNumber !== undefined) {
      fields.push('`reference_number` = ?');
      values.push(data.referenceNumber || null);
    }
    if (data.status !== undefined) {
      fields.push('`status` = ?');
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      fields.push('`notes` = ?');
      values.push(data.notes || null);
    }

    if (fields.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE \`expenses\` SET ${fields.join(', ')} WHERE id = ?`,
        ...values,
      );
    }

    const updated = await this.findById(id);
    return updated!;
  },

  async delete(id: string): Promise<void> {
    await ensureTable();
    await prisma.$executeRawUnsafe('DELETE FROM `expenses` WHERE id = ?', id);
  },

  async findMany(params: {
    search?: string;
    category?: string;
    siteId?: string;
    employeeId?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }): Promise<{ items: ExpenseRecord[]; total: number }> {
    await ensureTable();
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (params.category) {
      conditions.push('e.category = ?');
      values.push(params.category);
    }
    if (params.siteId) {
      conditions.push('e.site_id = ?');
      values.push(params.siteId);
    }
    if (params.employeeId) {
      conditions.push('e.employee_id = ?');
      values.push(params.employeeId);
    }
    if (params.from) {
      conditions.push('e.date >= ?');
      values.push(params.from.slice(0, 10));
    }
    if (params.to) {
      conditions.push('e.date <= ?');
      values.push(params.to.slice(0, 10));
    }
    if (params.search) {
      conditions.push(
        '(e.title LIKE ? OR e.expense_number LIKE ? OR e.vendor_name LIKE ? OR e.reference_number LIKE ? OR s.name LIKE ? OR emp.name LIKE ?)',
      );
      const s = `%${params.search}%`;
      values.push(s, s, s, s, s, s);
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `
      SELECT COUNT(*) as total 
      FROM \`expenses\` e
      LEFT JOIN \`sites\` s ON e.site_id = s.id
      LEFT JOIN \`employees\` emp ON e.employee_id = emp.id
      WHERE ${whereClause}
    `;

    const countResult = (await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(
      countSql,
      ...values,
    )) as Array<{ total: bigint | number }>;
    const total = Number(countResult[0]?.total ?? 0);

    const offset = (params.page - 1) * params.limit;
    const listSql = `
      SELECT e.*, s.name as site_name, emp.name as emp_name, emp.employee_code as emp_code
      FROM \`expenses\` e
      LEFT JOIN \`sites\` s ON e.site_id = s.id
      LEFT JOIN \`employees\` emp ON e.employee_id = emp.id
      WHERE ${whereClause}
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = (await prisma.$queryRawUnsafe<any[]>(
      listSql,
      ...values,
      params.limit,
      offset,
    )) as any[];

    return {
      items: rows.map(mapRow),
      total,
    };
  },

  async getSummary(params?: { siteId?: string; from?: string; to?: string }) {
    await ensureTable();
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (params?.siteId) {
      conditions.push('site_id = ?');
      values.push(params.siteId);
    }
    if (params?.from) {
      conditions.push('date >= ?');
      values.push(params.from.slice(0, 10));
    }
    if (params?.to) {
      conditions.push('date <= ?');
      values.push(params.to.slice(0, 10));
    }

    const whereClause = conditions.join(' AND ');

    const rows = (await prisma.$queryRawUnsafe<
      Array<{ category: string; total_amount: number | string; count: bigint | number }>
    >(
      `SELECT category, SUM(amount) as total_amount, COUNT(*) as count 
       FROM \`expenses\` 
       WHERE ${whereClause}
       GROUP BY category`,
      ...values,
    )) as Array<{ category: string; total_amount: number | string; count: bigint | number }>;

    let totalAmount = 0;
    let totalCount = 0;
    let materialAmount = 0;
    let materialCount = 0;
    let uniformAmount = 0;
    let uniformCount = 0;
    let advanceAmount = 0;
    let advanceCount = 0;
    let otherAmount = 0;
    let otherCount = 0;

    for (const r of rows) {
      const amt = Number(r.total_amount || 0);
      const cnt = Number(r.count || 0);
      totalAmount += amt;
      totalCount += cnt;

      if (r.category === 'MATERIAL') {
        materialAmount = amt;
        materialCount = cnt;
      } else if (r.category === 'UNIFORM') {
        uniformAmount = amt;
        uniformCount = cnt;
      } else if (r.category === 'ADVANCE') {
        advanceAmount = amt;
        advanceCount = cnt;
      } else {
        otherAmount += amt;
        otherCount += cnt;
      }
    }

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalCount,
      materialAmount: Math.round(materialAmount * 100) / 100,
      materialCount,
      uniformAmount: Math.round(uniformAmount * 100) / 100,
      uniformCount,
      advanceAmount: Math.round(advanceAmount * 100) / 100,
      advanceCount,
      otherAmount: Math.round(otherAmount * 100) / 100,
      otherCount,
    };
  },
};
