// src/controller/manager.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ManagerAuth from '../models/ManagerAuth';
import UserAuth from '../models/UserAuth';
import multer from 'multer';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  },
});

const upload = multer({ storage });

// Register a new manager
export const registerManager = async (req: Request, res: Response) => {
  try {
    const { fullName, lastName, email, password, phone } = req.body;
    const profilePic = req.file ? req.file.path : null;

    // Check if manager already exists
    const existingManager = await ManagerAuth.findOne({ email });
    if (existingManager) {
      return res.status(400).json({ message: 'Manager already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new manager with default role as 'employee'
    const manager = new ManagerAuth({
      fullName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      profilePic,
      role: 'employee', // Default role is employee
    });

    await manager.save();

    // Generate JWT token with role
    const token = jwt.sign(
      {
        userId: manager._id,
        email: manager.email,
        role: manager.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Manager registered successfully',
      token,
      manager: {
        id: manager._id,
        fullName: manager.fullName,
        email: manager.email,
        profilePic: manager.profilePic,
        role: manager.role,
      },
    });
  } catch (error) {
    console.error('Error registering manager:', error);
    res.status(500).json({ message: 'Error registering manager' });
  }
};

// Login manager
export const loginManager = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find manager
    const manager = await ManagerAuth.findOne({ email });
    if (!manager) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, manager.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token with role
    const token = jwt.sign(
      {
        userId: manager._id,
        email: manager.email,
        role: manager.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      manager: {
        id: manager._id,
        fullName: manager.fullName,
        email: manager.email,
        profilePic: manager.profilePic,
        role: manager.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
};

// Get manager profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).manager.userId; // Use `manager` instead of `user`
    const manager = await ManagerAuth.findById(userId).select('-password');

    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.json({
      id: manager._id,
      email: manager.email,
      fullName: manager.fullName,
      lastName: manager.lastName,
      phone: manager.phone,
      profilePic: manager.profilePic,
      role: manager.role,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update manager profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).manager.userId;
    const { fullName, lastName, phone } = req.body;
    const profilePic = req.file ? req.file.path : undefined;

    const manager = await ManagerAuth.findByIdAndUpdate(
      userId,
      {
        fullName,
        lastName,
        phone,
        ...(profilePic && { profilePic }),
      },
      { new: true }
    ).select('-password');

    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      manager: {
        id: manager._id,
        email: manager.email,
        fullName: manager.fullName,
        lastName: manager.lastName,
        phone: manager.phone,
        profilePic: manager.profilePic,
        role: manager.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Multer middleware for file uploads
export const uploadMiddleware = upload.single('profilePic');

// Forgot password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    // Implement forgot password logic
  } catch (error) {
    res.status(500).json({ message: 'Error processing forgot password request' });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    // Implement reset password logic
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Fetch all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserAuth.find({}, { password: 0 }); // Exclude passwords
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Add a new user
export const addUser = async (req: Request, res: Response) => {
  const { fullName, email, password, phone, nationality } = req.body;

  try {
    const user = new UserAuth({ fullName, email, password, phone, nationality });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: 'Failed to add user' });
  }
};

// Update user status (active/banned)
export const updateUserStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  try {
    const user = await UserAuth.findByIdAndUpdate(userId, { isActive }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update user status' });
  }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await UserAuth.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete user' });
  }
};

// Fetch all team members
export const getAllTeamMembers = async (req: Request, res: Response) => {
  try {
    const team = await ManagerAuth.find({}, '-password');
    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Error fetching team members' });
  }
};

// Update team member role
export const updateTeamMemberRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['manager', 'employee'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified',
      });
    }

    const updatedMember = await ManagerAuth.findByIdAndUpdate(
      id,
      { role },
      { new: true, select: '-password' }
    );

    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
    }

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: updatedMember,
    });
  } catch (error) {
    console.error('Error updating team member role:', error);
    res.status(500).json({ message: 'Error updating role' });
  }
};