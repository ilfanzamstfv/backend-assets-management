import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import masterDataRoutes from './routes/masterDataRoutes.js';
import purchaseHistoryRoutes from './routes/purchaseHistoryRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import userManagementRoutes from './routes/userManagementRoutes.js';
import passport from './config/passport.js';
import { ensureAuthorizationSetup } from './services/bootstrapService.js';
import { createUser, forgotPassword, loginUser, resetPassword, verifyResetCode } from './controllers/userController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to Asset Management Backend API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', masterDataRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/purchase-histories', purchaseHistoryRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/roles', roleRoutes);

// Legacy auth endpoints kept for compatibility with the existing frontend.
app.post('/api/user/create', createUser);
app.post('/api/login', loginUser);
app.post('/api/forgot-password', forgotPassword);
app.post('/api/verify-reset-code', verifyResetCode);
app.post('/api/reset-password', resetPassword);

const startServer = async () => {
  try {
    await ensureAuthorizationSetup();

    app.listen(PORT, () => {
      console.log(`Server is running smoothly on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
