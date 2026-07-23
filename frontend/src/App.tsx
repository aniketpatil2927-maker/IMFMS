import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { SitesPage } from './pages/SitesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { AttendancePage } from './pages/AttendancePage';
import { QuotationsPage } from './pages/QuotationsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { BillsPage } from './pages/BillsPage';
import { ReportsPage } from './pages/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="change-password" element={<ChangePasswordPage />} />
                <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']} />}>
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="sites" element={<SitesPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'SITE_SUPERVISOR']} />}>
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="attendance" element={<AttendancePage />} />
                </Route>
                <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF']} />}>
                  <Route path="quotations" element={<QuotationsPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="bills" element={<BillsPage />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR']} />
                  }
                >
                  <Route path="reports" element={<ReportsPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
