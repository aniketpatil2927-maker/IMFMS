import { Router } from 'express';
import { Role } from '@prisma/client';
import { employeeController } from '../controllers/employee.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { employeeSchema, transferSchema } from '../validators/employee.validator.js';

const router = Router();
const manage = [Role.SUPER_ADMIN, Role.ADMIN] as const;
const view = [Role.SUPER_ADMIN, Role.ADMIN, Role.SITE_SUPERVISOR] as const;

router.use(authenticate);
router.get('/', authorize(...view), employeeController.list);
router.get('/:id', authorize(...view), employeeController.getById);
router.post('/', authorize(...manage), validateBody(employeeSchema), employeeController.create);
router.put('/:id', authorize(...manage), validateBody(employeeSchema), employeeController.update);
router.put(
  '/:id/transfer',
  authorize(...manage),
  validateBody(transferSchema),
  employeeController.transfer,
);
router.put('/:id/disable', authorize(...manage), employeeController.disable);

export default router;
