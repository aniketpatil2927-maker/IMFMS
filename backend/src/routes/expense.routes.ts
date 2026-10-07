import { Router } from 'express';
import { Role } from '@prisma/client';
import { expenseController } from '../controllers/expense.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { expenseCreateSchema, expenseUpdateSchema } from '../validators/expense.validator.js';

const router = Router();
const roles = [Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF] as const;

router.use(authenticate, authorize(...roles));

router.get('/summary', expenseController.summary);
router.get('/export/excel', expenseController.exportExcel);
router.get('/export/pdf', expenseController.exportPdf);
router.get('/:id', expenseController.getById);
router.get('/', expenseController.list);

router.post('/', validateBody(expenseCreateSchema), expenseController.create);
router.put('/:id', validateBody(expenseUpdateSchema), expenseController.update);
router.delete('/:id', expenseController.delete);

export default router;
