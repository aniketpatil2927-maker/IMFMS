import { prisma } from '../config/database.js';

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { site: { select: { id: true, name: true } } },
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        siteId: true,
        isActive: true,
        site: { select: { id: true, name: true } },
      },
    });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  },
};
