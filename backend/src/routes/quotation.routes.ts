import { Router } from 'express';
import { Role } from '@prisma/client';
import { quotationController } from '../controllers/quotation.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { quotationSchema } from '../validators/quotation.validator.js';

const router = Router();
const roles = [Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF] as const;

router.use(authenticate, authorize(...roles));
router.get('/', quotationController.list);
router.get('/:id', quotationController.getById);
router.get('/:id/pdf', quotationController.pdf);
router.post('/', validateBody(quotationSchema), quotationController.create);
router.put('/:id', validateBody(quotationSchema), quotationController.update);
router.post('/:id/duplicate', quotationController.duplicate);
router.delete('/:id', quotationController.remove);

export default router;
