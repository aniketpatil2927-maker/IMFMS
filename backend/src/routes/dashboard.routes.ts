import { Router } from 'express';
import { Role } from '@prisma/client';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/index.js';

const router = Router();

router.use(
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF, Role.SITE_SUPERVISOR),
);
router.get('/stats', dashboardController.stats);

export default router;
