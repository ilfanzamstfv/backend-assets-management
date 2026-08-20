import prisma from '../config/prisma.js';
import { verifyAuthToken } from '../utils/jwt.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const token = authorization.slice(7);
    const payload = verifyAuthToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
};
