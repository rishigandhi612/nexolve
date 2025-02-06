// src/routes/query.routes.ts
import express from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware';
import { managerAuthMiddleware } from '../middleware/managerAuth.middleware';
import {
  getAllQueries,
  getUserQueries,
  createQuery,
  updateQueryStatus,
  respondToQuery,
} from '../controller/query.controller';

const router = express.Router();

// Customer routes
router.post('/', customerAuthMiddleware, createQuery);
router.get('/user', customerAuthMiddleware, getUserQueries);

// Manager routes
router.get('/all', managerAuthMiddleware, getAllQueries);
router.patch('/:id/status', managerAuthMiddleware, updateQueryStatus);
router.post('/:id/respond', managerAuthMiddleware, respondToQuery);

export default router;