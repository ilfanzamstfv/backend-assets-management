import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import prisma from '../config/prisma.js';
import { sendResetPasswordEmail } from '../config/mailer.js';
import { getDefaultRoleId } from '../services/bootstrapService.js';
import { buildPagedResponse, getPagination } from '../utils/http.js';
import { signAuthToken } from '../utils/jwt.js';

const RESET_CODE_EXPIRY_MINUTES = 15;

const userInclude = {
  role: true,
};

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const { password, resetPasswordCode, resetCodeExpiresAt, ...safeUser } = user;
  return safeUser;
};

const validateResetCode = async (email, resetCode) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.resetPasswordCode || !user.resetCodeExpiresAt) {
    return { error: 'Invalid or expired reset code' };
  }

  if (user.resetCodeExpiresAt < new Date()) {
    await prisma.user.update({
      where: { email },
      data: { resetPasswordCode: null, resetCodeExpiresAt: null },
    });

    return { error: 'Invalid or expired reset code' };
  }

  const isValidResetCode = await bcrypt.compare(resetCode, user.resetPasswordCode);
  if (!isValidResetCode) {
    return { error: 'Invalid or expired reset code' };
  }

  return { user };
};

export const createUser = async (req, res) => {
  try {
    const { email, name, password, roleId, status } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRoleId = req.user ? roleId || (await getDefaultRoleId()) : await getDefaultRoleId();

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        roleId: assignedRoleId,
        status: req.user && status ? status : 'ACTIVE',
      },
      include: userInclude,
    });

    res.status(201).json({ status: 'success', data: sanitizeUser(user) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Email already exists' });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });

    if (!user || !user.password) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ status: 'error', message: 'User is inactive' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const token = signAuthToken(user);

    res.json({
      status: 'success',
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  res.json({ status: 'success', data: sanitizeUser(req.user) });
};

export const getUsers = async (req, res) => {
  try {
    const { search, roleId, status } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(roleId ? { roleId: Number(roleId) } : {}),
      ...(status ? { status } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      status: 'success',
      ...buildPagedResponse({
        data: users.map(sanitizeUser),
        total,
        page,
        limit,
      }),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: userInclude,
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({ status: 'success', data: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, roleId, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existingUser) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(roleId !== undefined ? { roleId: Number(roleId) } : {}),
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      },
      include: userInclude,
    });

    res.json({ status: 'success', data: sanitizeUser(user) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Email already exists' });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const adminResetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await prisma.user.update({
      where: { id: Number(id) },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        resetPasswordCode: null,
        resetCodeExpiresAt: null,
      },
    });

    res.json({ status: 'success', message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ status: 'success', message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const successMessage = 'If the email is registered, a reset code has been sent';

    if (!user) {
      return res.json({ status: 'success', message: successMessage });
    }

    const resetCode = randomInt(100000, 1000000).toString();
    const hashedResetCode = await bcrypt.hash(resetCode, 10);
    const resetCodeExpiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { resetPasswordCode: hashedResetCode, resetCodeExpiresAt },
    });

    await sendResetPasswordEmail(email, resetCode);
    res.json({ status: 'success', message: successMessage });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const verifyResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    const resetCode = req.body.resetCode || req.body.code;

    if (!email || !resetCode) {
      return res.status(400).json({ status: 'error', message: 'Email and reset code are required' });
    }

    const { error } = await validateResetCode(email, resetCode);
    if (error) {
      return res.status(400).json({ status: 'error', message: error });
    }

    res.json({ status: 'success', message: 'Reset code verified' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const resetCode = req.body.resetCode || req.body.code;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ status: 'error', message: 'Email, reset code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
    }

    const { error } = await validateResetCode(email, resetCode);
    if (error) {
      return res.status(400).json({ status: 'error', message: error });
    }

    await prisma.user.update({
      where: { email },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        resetPasswordCode: null,
        resetCodeExpiresAt: null,
      },
    });

    res.json({ status: 'success', message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
