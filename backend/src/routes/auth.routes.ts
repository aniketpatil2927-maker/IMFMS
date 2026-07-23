import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate, validateBody } from '../middlewares/index.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword,
);

export default router;
