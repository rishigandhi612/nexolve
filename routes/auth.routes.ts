import express from 'express';
import multer from 'multer';
import {
  signup,
  signin,
  forgotPassword,
  getProfile,
  logout,
  updateProfile,
  updateProfilePhoto,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  bulkActionUsers,
} from '../controller/auth.controller';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware';

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Public routes
router.post('/signup', upload.single('profilePic'), signup);
router.post('/signin', signin);
router.post('/forgot-password', forgotPassword);

// Protected routes - Profile Management
router.get('/me', customerAuthMiddleware, getProfile);
router.post('/logout', customerAuthMiddleware, logout);
router.put('/update-profile', customerAuthMiddleware, updateProfile);
router.post('/update-photo', customerAuthMiddleware, upload.single('profilePic'), updateProfilePhoto);

// Protected routes - User Management
router.get('/users', customerAuthMiddleware, getAllUsers);
router.put('/users/:userId/status', customerAuthMiddleware, updateUserStatus);
router.delete('/users/:userId', customerAuthMiddleware, deleteUser);
router.post('/users/bulk-action', customerAuthMiddleware, bulkActionUsers);

export default router;