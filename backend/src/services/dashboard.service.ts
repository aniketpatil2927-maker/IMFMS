import { clientRepository } from '../repositories/client.repository.js';
import { siteRepository } from '../repositories/site.repository.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { quotationRepository } from '../repositories/quotation.repository.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';

export const dashboardService = {
  async getStats(siteId?: string | null) {
    const [
      totalClients,
      totalSites,
      totalEmployees,
      todaysAttendance,
      pendingQuotations,
      pendingInvoices,
    ] = await Promise.all([
      siteId ? Promise.resolve(null) : clientRepository.count(),
      siteId ? Promise.resolve(null) : siteRepository.count(),
      siteId
        ? employeeRepository.findMany({ siteId, isActive: true, page: 1, limit: 1 }).then((r) => r.total)
        : employeeRepository.count(true),
      attendanceRepository.countToday(siteId ?? undefined),
      siteId ? Promise.resolve(null) : quotationRepository.countPending(),
      siteId ? Promise.resolve(null) : invoiceRepository.countPending(),
    ]);

    return {
      totalClients,
      totalSites,
      totalEmployees,
      todaysAttendance,
      pendingQuotations,
      pendingInvoices,
    };
  },
};
