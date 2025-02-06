import express from 'express';
import multer from 'multer';
import {
  registerManager,
  loginManager,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  getUsers,
  addUser,
  updateUserStatus,
  deleteUser,
  getAllTeamMembers,
  updateTeamMemberRole
} from '../controller/manager.controller';
import { managerAuthMiddleware } from '../middleware/managerAuth.middleware';
import { requireRole } from '../middleware/roleAuth.middleware';

const router = express.Router();

// Storage configuration remains the same
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Public routes
router.post('/register', upload.single('profilePic'), registerManager);
router.post('/login', loginManager);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes accessible by both roles
router.get('/profile', managerAuthMiddleware, getProfile);
router.put('/profile', managerAuthMiddleware, upload.single('profilePic'), updateProfile);

// Team management routes - only accessible by managers
router.get('/team', managerAuthMiddleware, requireRole('manager'), getAllTeamMembers);
router.patch('/team/:id/role', managerAuthMiddleware, requireRole('manager'), updateTeamMemberRole);

// User management routes - only accessible by managers
router.get('/users', managerAuthMiddleware, requireRole('manager'), getUsers);
router.post('/users', managerAuthMiddleware, requireRole('manager'), addUser);
router.put('/users/:userId/status', managerAuthMiddleware, requireRole('manager'), updateUserStatus);
router.delete('/users/:userId', managerAuthMiddleware, requireRole('manager'), deleteUser);

export default router;