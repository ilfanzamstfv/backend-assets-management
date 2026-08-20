import prisma from '../config/prisma.js';

const roleInclude = {
  permissions: {
    include: {
      permission: true,
    },
  },
};

export const listRoles = async (_req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: roleInclude,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ status: 'success', data: roles });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: Number(req.params.id) },
      include: roleInclude,
    });

    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    res.json({ status: 'success', data: role });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createRole = async (req, res) => {
  try {
    const role = await prisma.role.create({
      data: {
        name: req.body.name,
        description: req.body.description,
      },
      include: roleInclude,
    });

    res.status(201).json({ status: 'success', data: role });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Role already exists' });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: Number(req.params.id) } });
    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    const updatedRole = await prisma.role.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
        ...(req.body.description !== undefined ? { description: req.body.description } : {}),
      },
      include: roleInclude,
    });

    res.json({ status: 'success', data: updatedRole });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Role already exists' });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: Number(req.params.id) },
      include: { users: true },
    });

    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ status: 'error', message: 'System roles cannot be deleted' });
    }

    if (role.users.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Role is assigned to users' });
    }

    await prisma.role.delete({ where: { id: Number(req.params.id) } });
    res.json({ status: 'success', message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listPermissions = async (_req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    res.json({ status: 'success', data: permissions });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const assignRolePermissions = async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const { permissionIds = [], permissions = [] } = req.body;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    let normalizedPermissionIds = permissionIds.map(Number).filter(Boolean);

    if (permissions.length > 0) {
      const existingPermissions = await prisma.permission.findMany({
        where: {
          OR: permissions.map(({ module, action }) => ({ module, action })),
        },
      });

      normalizedPermissionIds = existingPermissions.map((permission) => permission.id);
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (normalizedPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: normalizedPermissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    });

    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: roleInclude,
    });

    res.json({ status: 'success', data: updatedRole });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
