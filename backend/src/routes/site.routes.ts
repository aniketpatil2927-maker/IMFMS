import { Router } from 'express';
import { Role } from '@prisma/client';
import { siteController } from '../controllers/site.controller.js';
import { authenticate, authorize, validateBody } from '../middlewares/index.js';
import { siteSchema } from '../validators/site.validator.js';

const router = Router();
const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN] as const;
const viewRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.OFFICE_STAFF, Role.SITE_SUPERVISOR] as const;

router.use(authenticate);
router.get('/lite/list', authorize(...viewRoles), siteController.listLite);
router.get('/', authorize(...adminRoles), siteController.list);
router.get('/:id', authorize(...viewRoles), siteController.getById);
router.post('/', authorize(...adminRoles), validateBody(siteSchema), siteController.create);
router.put('/:id', authorize(...adminRoles), validateBody(siteSchema), siteController.update);
router.delete('/:id', authorize(...adminRoles), siteController.remove);

export default router;
