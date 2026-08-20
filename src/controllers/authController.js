import { signAuthToken } from '../utils/jwt.js';

// Google callback
export const googleCallback = (req, res) => {
  try {
    const user = req.user;
    const token = signAuthToken(user);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Github callback
export const githubCallback = (req, res) => {
  try {
    const user = req.user;
    const token = signAuthToken(user);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
