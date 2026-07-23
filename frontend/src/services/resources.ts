import api from './api';
import type { ApiResponse, Bill, Client, DashboardStats, Employee, Invoice, Pagination, Quotation, Site } from '../types';

export const dashboardApi = {
  stats() {
    return api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
  },
};

export const clientsApi = {
  list(params?: Record<string, unknown>) {
    return api.get<ApiResponse<{ items: Client[]; pagination: Pagination }>>('/clients', { params });
  },
  get(id: string) {
    return api.get<ApiResponse<Client>>(`/clients/${id}`);
  },
  create(data: unknown) {
    return api.post<ApiResponse<Client>>('/clients', data);
  },
  update(id: string, data: unknown) {
    return api.put<ApiResponse<Client>>(`/clients/${id}`, data);
  },
  remove(id: string) {
    return api.delete<ApiResponse<{ message: string }>>(`/clients/${id}`);
  },
};

export const sitesApi = {
  list(params?: Record<string, unknown>) {
    return api.get<ApiResponse<{ items: Site[]; pagination: Pagination }>>('/sites', { params });
  },
  lite(clientId?: string) {
    return api.get<ApiResponse<Array<{ id: string; name: string; clientId: string }>>>('/sites/lite/list', {
      params: { clientId },
    });
  },
  get(id: string) {
    return api.get<ApiResponse<Site>>(`/sites/${id}`);
  },
  create(data: unknown) {
    return api.post<ApiResponse<Site>>('/sites', data);
  },
  update(id: string, data: unknown) {
    return api.put<ApiResponse<Site>>(`/sites/${id}`, data);
  },
  remove(id: string) {
    return api.delete<ApiResponse<{ message: string }>>(`/sites/${id}`);
  },
};

export const employeesApi = {
  list(params?: Record<string, unknown>) {
    return api.get<ApiResponse<{ items: Employee[]; pagination: Pagination }>>('/employees', { params });
  },
  get(id: string) {
    return api.get<ApiResponse<Employee>>(`/employees/${id}`);
  },
  create(data: unknown) {
    return api.post<ApiResponse<Employee>>('/employees', data);
  },
  update(id: string, data: unknown) {
    return api.put<ApiResponse<Employee>>(`/employees/${id}`, data);
  },
  transfer(id: string, siteId: string) {
    return api.put<ApiResponse<Employee>>(`/employees/${id}/transfer`, { siteId });
  },
  disable(id: string) {
    return api.put<ApiResponse<Employee>>(`/employees/${id}/disable`);
  },
};

export const attendanceApi = {
  getDaily(params: { siteId: string; date: string }) {
    return api.get<ApiResponse<{
      site: { id: string; name: string };
      date: string;
      entries: Array<{
        employee: { id: string; employeeCode: string; name: string; designation: string };
        status: string | null;
      }>;
    }>>('/attendance/daily', { params });
  },
  saveDaily(data: unknown) {
    return api.post('/attendance/daily', data);
  },
  getMonthly(params: Record<string, unknown>) {
    return api.get('/attendance/monthly', { params });
  },
  exportExcel(params: Record<string, unknown>) {
    return api.get('/attendance/export/excel', { params, responseType: 'blob' });
  },
  exportPdf(params: Record<string, unknown>) {
    return api.get('/attendance/export/pdf', { params, responseType: 'blob' });
  },
};

export const quotationsApi = {
  list(params?: Record<string, unknown>) {
    return api.get<ApiResponse<{ items: Quotation[]; pagination: Pagination }>>('/quotations', { params });
  },
  get(id: string) {
    return api.get<ApiResponse<Quotation>>(`/quotations/${id}`);
  },
  create(data: unknown) {
    return api.post<ApiResponse<Quotation>>('/quotations', data);
  },
  update(id: string, data: unknown) {
    return api.put<ApiResponse<Quotation>>(`/quotations/${id}`, data);
  },
  duplicate(id: string) {
    return api.post<ApiResponse<Quotation>>(`/quotations/${id}/duplicate`);
  },
  remove(id: string) {
    return api.delete(`/quotations/${id}`);
  },
  pdf(id: string) {
    return api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
  },
};

export const invoicesApi = {
  list(params?: Record<string, unknown>) {
    return api.get<ApiResponse<{ items: Invoice[]; pagination: Pagination }>>('/invoices', { params });
  },
  get(id: string) {
    return api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
  },
  create(data: unknown) {
    return api.post<ApiResponse<Invoice>>('/invoices', data);
  },
  update(id: string, data: unknown) {
    return api.put<ApiResponse<Invoice>>(`/invoices/${id}`, data);
  },
  remove(id: string) {
    return api.delete(`/invoices/${id}`);
  },
  pdf(id: string) {
    return api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  },
};

export const billsApi = {
  list(params?: Record<string, unknown>) {
    return api.get<ApiResponse<{ items: Bill[]; pagination: Pagination }>>('/bills', { params });
  },
  get(id: string) {
    return api.get<ApiResponse<Bill>>(`/bills/${id}`);
  },
  generate(data: unknown) {
    return api.post<ApiResponse<Bill>>('/bills/generate', data);
  },
  pdf(id: string) {
    return api.get(`/bills/${id}/pdf`, { responseType: 'blob' });
  },
};

export const reportsApi = {
  get(type: string, params?: Record<string, unknown>) {
    return api.get(`/reports/${type}`, { params });
  },
  export(type: string, params?: Record<string, unknown>) {
    return api.get(`/reports/${type}/export`, { params, responseType: 'blob' });
  },
};
