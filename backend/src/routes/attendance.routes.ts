import { Router } from 'express';
import { Role } from '@prisma/client';
import { attendanceController } from '../controllers/attendance.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { dailyAttendanceSchema } from '../validators/attendance.validator.js';
import multer from 'multer';

const router = Router();
const roles = [Role.SUPER_ADMIN, Role.ADMIN, Role.SITE_SUPERVISOR] as const;
const bulkUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate, authorize(...roles));
router.post('/daily', validateBody(dailyAttendanceSchema), attendanceController.saveDaily);
router.get('/daily', attendanceController.getDaily);
router.get('/monthly', attendanceController.getMonthly);
router.get('/export/excel', attendanceController.exportExcel);
router.get('/export/pdf', attendanceController.exportPdf);
router.post('/upload-photo', bulkUpload.single('photo'), attendanceController.uploadPhoto);
router.post('/parse-bulk', bulkUpload.any(), attendanceController.parseBulkUpload);
router.post('/generate-register', attendanceController.generateRegisterExcel);
router.post('/generate-register-pdf', attendanceController.generateRegisterPdf);
router.post('/save-bulk', attendanceController.saveBulkRegister);

export default router;

