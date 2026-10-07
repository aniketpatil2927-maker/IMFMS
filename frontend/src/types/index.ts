export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'OFFICE_STAFF' | 'SITE_SUPERVISOR';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';

export type DocumentStatus = 'DRAFT' | 'PENDING' | 'FINALIZED';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  siteId: string | null;
  site?: { id: string; name: string } | null;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string | null;
  gstNumber: string | null;
  address: string;
  _count?: { sites: number };
}

export interface Site {
  id: string;
  name: string;
  clientId: string;
  address: string;
  supervisorName: string;
  contactNumber: string;
  client?: { id: string; companyName: string };
  _count?: { employees: number };
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  mobile: string;
  aadhaar: string | null;
  pan?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branch?: string | null;
  designation: string;
  salary: string | number;
  joiningDate: string;
  siteId: string;
  isActive: boolean;
  site?: { id: string; name: string };
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  date: string;
  clientId: string;
  siteId: string;
  terms: string | null;
  status: DocumentStatus;
  subtotal: string | number;
  gstPercent: string | number;
  gstAmount: string | number;
  total: string | number;
  client?: { id: string; companyName: string };
  site?: { id: string; name: string };
  items?: Array<{
    id?: string;
    serviceDescription: string;
    numberOfEmployees: number;
    duty?: string | null;
    rate: string | number;
    amount: string | number;
  }>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  clientId: string;
  siteId: string;
  periodFrom: string;
  periodTo: string;
  status: DocumentStatus;
  subtotal: string | number;
  gstPercent: string | number;
  gstAmount: string | number;
  total: string | number;
  client?: { id: string; companyName: string };
  site?: { id: string; name: string };
  items?: Array<{
    id?: string;
    serviceDetails: string;
    quantity: string | number;
    rate: string | number;
    mandays?: string | number | null;
    actualMandays?: string | number | null;
    amount: string | number;
  }>;
}

export interface Bill {
  id: string;
  billNumber: string;
  invoiceId: string;
  billingMonth: string;
  attendanceYear: number;
  attendanceMonth: number;
  totalEmployees: number;
  amount: string | number;
  gstPercent: string | number;
  gstAmount: string | number;
  grandTotal: string | number;
  invoice?: {
    id: string;
    invoiceNumber: string;
    client?: { id: string; companyName: string };
    site?: { id: string; name: string };
  };
}

export interface DashboardStats {
  totalClients: number | null;
  totalSites: number | null;
  totalEmployees: number | null;
  todaysAttendance: number | null;
  pendingQuotations: number | null;
  pendingInvoices: number | null;
}

export type ExpenseCategory = 'MATERIAL' | 'UNIFORM' | 'ADVANCE' | 'OTHER';
export type ExpensePaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE';
export type ExpenseStatus = 'PAID' | 'PENDING' | 'APPROVED';

export interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  siteId?: string | null;
  employeeId?: string | null;
  paymentMode: ExpensePaymentMode;
  vendorName?: string | null;
  referenceNumber?: string | null;
  status: ExpenseStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  site?: { id: string; name: string } | null;
  employee?: { id: string; employeeCode: string; name: string } | null;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  materialAmount: number;
  materialCount: number;
  uniformAmount: number;
  uniformCount: number;
  advanceAmount: number;
  advanceCount: number;
  otherAmount: number;
  otherCount: number;
}

