import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import weekRoutes from './routes/weeks';
import dayRoutes from './routes/days';
import exerciseRoutes from './routes/exercises';
import setRoutes from './routes/sets';
import mealRoutes from './routes/meals';
import userRoutes from './routes/user';
import trendsRoutes from './routes/trends';
import communityRoutes from './routes/community';
import { authMiddleware } from './middleware/auth';

export const prisma = new PrismaClient();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/weeks', authMiddleware, weekRoutes);
app.use('/api/days', authMiddleware, dayRoutes);
app.use('/api/exercises', authMiddleware, exerciseRoutes);
app.use('/api/sets', authMiddleware, setRoutes);
app.use('/api/meals', authMiddleware, mealRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/trends', authMiddleware, trendsRoutes);
app.use('/api/community', authMiddleware, communityRoutes);

// Error handler
const isProduction = process.env.NODE_ENV === 'production';
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : (err.message || 'Internal server error'),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
