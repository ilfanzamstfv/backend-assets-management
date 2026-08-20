import jwt from 'jsonwebtoken';

export const signAuthToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role?.name || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

export const verifyAuthToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
