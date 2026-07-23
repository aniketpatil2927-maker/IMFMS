import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import clientRoutes from './client.routes.js';
import siteRoutes from './site.routes.js';
import employeeRoutes from './employee.routes.js';
import attendanceRoutes from './attendance.routes.js';
import quotationRoutes from './quotation.routes.js';
import invoiceRoutes from './invoice.routes.js';
import billRoutes from './bill.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/clients', clientRoutes);
router.use('/sites', siteRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/quotations', quotationRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/bills', billRoutes);
router.use('/reports', reportRoutes);

export default router;
