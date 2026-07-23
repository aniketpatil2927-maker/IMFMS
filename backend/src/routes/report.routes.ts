import { Router } from 'express';
import { Role } from '@prisma/client';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middlewares/index.js';

const router = Router();
const allReportRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF, Role.SITE_SUPERVISOR] as const;
const officeRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF] as const;

router.use(authenticate);
router.get('/attendance', authorize(...allReportRoles), reportController.attendance);
router.get('/employees', authorize(...officeRoles), reportController.employees);
router.get('/quotations', authorize(...officeRoles), reportController.quotations);
router.get('/invoices', authorize(...officeRoles), reportController.invoices);
router.get('/bills', authorize(...officeRoles), reportController.bills);
router.get('/:type/export', authorize(...allReportRoles), reportController.export);

export default router;
