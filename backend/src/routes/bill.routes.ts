import { Router } from 'express';
import { Role } from '@prisma/client';
import { billController } from '../controllers/bill.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { billGenerateSchema } from '../validators/bill.validator.js';

const router = Router();
const roles = [Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF] as const;

router.use(authenticate, authorize(...roles));
router.get('/', billController.list);
router.get('/:id', billController.getById);
router.get('/:id/pdf', billController.pdf);
router.post('/generate', validateBody(billGenerateSchema), billController.generate);

export default router;
