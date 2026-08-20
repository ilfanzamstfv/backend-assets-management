export const requirePermission = (module, action) => (req, res, next) => {
  const permissions = req.user?.role?.permissions || [];
  const allowed = permissions.some(
    ({ permission }) => permission.module === module && permission.action === action
  );

  if (!allowed) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }

  next();
};
