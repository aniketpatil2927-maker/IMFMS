import { userRepository } from '../repositories/user.repository.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
} from '../validators/auth.validator.js';

export const authService = {
  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email.toLowerCase().trim());
    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      siteId: user.siteId,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        siteId: user.siteId,
        site: user.site,
      },
    };
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  async changePassword(userId: string, input: ChangePasswordInput) {
    const profile = await userRepository.findById(userId);
    if (!profile) {
      throw new AppError('User not found', 404);
    }

    const user = await userRepository.findByEmail(profile.email);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.updatePassword(userId, passwordHash);
    return { message: 'Password updated successfully' };
  },

  /**
   * Reset password by registered email (no SMTP in this app).
   * Always returns a generic message so emails cannot be enumerated.
   */
  async forgotPassword(input: ForgotPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);

    if (user && user.isActive) {
      const passwordHash = await hashPassword(input.newPassword);
      await userRepository.updatePassword(user.id, passwordHash);
    }

    return {
      message:
        'If an account exists for this email, the password has been updated. You can sign in now.',
    };
  },
};
