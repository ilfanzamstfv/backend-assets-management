import prisma from '../config/prisma.js';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../constants/accessControl.js';

const roleNames = Object.keys(DEFAULT_ROLE_PERMISSIONS);

export const ensureAuthorizationSetup = async () => {
  for (const [module, action] of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        module_action: {
          module,
          action,
        },
      },
      update: {},
      create: {
        module,
        action,
        description: `${action} access for ${module}`,
      },
    });
  }

  for (const roleName of roleNames) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName} default role`,
        isSystem: true,
      },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(
    permissions.map((permission) => [`${permission.module}:${permission.action}`, permission.id])
  );

  for (const roleName of roleNames) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    const expectedPairs = DEFAULT_ROLE_PERMISSIONS[roleName];

    for (const [module, action] of expectedPairs) {
      const permissionId = permissionMap.get(`${module}:${action}`);

      if (!permissionId) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }
};

export const getDefaultRoleId = async () => {
  await ensureAuthorizationSetup();

  const userCount = await prisma.user.count();
  const defaultRoleName = userCount === 0 ? 'ADMIN' : 'VIEWER';
  const role = await prisma.role.findUnique({ where: { name: defaultRoleName } });

  return role?.id ?? null;
};
