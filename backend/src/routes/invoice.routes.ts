import { Router } from 'express';
import { Role } from '@prisma/client';
import { invoiceController } from '../controllers/invoice.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { invoiceSchema } from '../validators/invoice.validator.js';

const router = Router();
const roles = [Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF] as const;

router.use(authenticate, authorize(...roles));
router.get('/', invoiceController.list);
router.get('/:id', invoiceController.getById);
router.get('/:id/pdf', invoiceController.pdf);
router.post('/', validateBody(invoiceSchema), invoiceController.create);
router.put('/:id', validateBody(invoiceSchema), invoiceController.update);
router.delete('/:id', invoiceController.remove);

export default router;
