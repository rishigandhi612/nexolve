import express from 'express';
import multer from 'multer';
import {
  registerManager,
  loginManager,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
} from '../controller/manager.controller';
import { managerAuthMiddleware } from '../middleware/managerAuth.middleware';

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
router.post('/register', upload.single('profilePic'), registerManager);
router.post('/login', loginManager);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', managerAuthMiddleware, getProfile);
router.put('/profile', managerAuthMiddleware, upload.single('profilePic'), updateProfile);

export default router;