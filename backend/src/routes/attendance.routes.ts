import { Router } from 'express';
import { Role } from '@prisma/client';
import { attendanceController } from '../controllers/attendance.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { dailyAttendanceSchema } from '../validators/attendance.validator.js';

const router = Router();
const roles = [Role.SUPER_ADMIN, Role.ADMIN, Role.SITE_SUPERVISOR] as const;

router.use(authenticate, authorize(...roles));
router.post('/daily', validateBody(dailyAttendanceSchema), attendanceController.saveDaily);
router.get('/daily', attendanceController.getDaily);
router.get('/monthly', attendanceController.getMonthly);
router.get('/export/excel', attendanceController.exportExcel);
router.get('/export/pdf', attendanceController.exportPdf);

export default router;
