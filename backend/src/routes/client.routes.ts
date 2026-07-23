import { Router } from 'express';
import { Role } from '@prisma/client';
import { clientController } from '../controllers/client.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { clientSchema } from '../validators/client.validator.js';

const router = Router();
const roles = [Role.SUPER_ADMIN, Role.ADMIN] as const;

router.use(authenticate, authorize(...roles));
router.get('/', clientController.list);
router.get('/:id', clientController.getById);
router.post('/', validateBody(clientSchema), clientController.create);
router.put('/:id', validateBody(clientSchema), clientController.update);
router.delete('/:id', clientController.remove);

export default router;
