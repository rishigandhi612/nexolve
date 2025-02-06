// auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import UserAuth from '../models/UserAuth';
import ManagerAuth from '../models/ManagerAuth';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, nationality } = req.body;
    const profilePic = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;

    // Check if user exists
    const existingUser = await UserAuth.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const user = new UserAuth({
      email,
      password,
      fullName,
      phone,
      nationality,
      profilePic
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await UserAuth.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePic: user.profilePic,
        phone: user.phone,
        nationality: user.nationality
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await UserAuth.findOne({ email });
    if (!user) {
      // We still return 200 for security
      return res.json({ message: 'If an account exists, password reset instructions have been sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    res.json({ 
      message: 'Password reset instructions sent',
      resetToken // In production, send this via email instead
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string };

    const user = await UserAuth.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      profilePic: user.profilePic,
      phone: user.phone,
      nationality: user.nationality
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};

export const logout = (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
};

// Add these functions to your auth.controller.ts

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { fullName, phone, nationality } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string };

    const user = await UserAuth.findByIdAndUpdate(
      decoded.userId,
      { 
        fullName, 
        phone, 
        nationality 
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePic: user.profilePic,
        phone: user.phone,
        nationality: user.nationality
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

export const updateProfilePhoto = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string };

    const profilePic = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const user = await UserAuth.findByIdAndUpdate(
      decoded.userId,
      { profilePic },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile photo updated successfully',
      user: {
        id: user._id,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Profile photo update error:', error);
    res.status(500).json({ message: 'Error updating profile photo' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserAuth.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.fullName,
      email: user.email,
      phone: user.phone || 'Not provided',
      status: user.isActive ? 'active' : 'inactive', // You can determine status based on your logic
      lastActive: user.updatedAt
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    // Instead of updating a status field, you might want to implement your own logic
    // For example, you could add an isActive field to your model
    const user = await UserAuth.findByIdAndUpdate(
      userId,
      { isActive: status === 'active' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        phone: user.phone || 'Not provided',
        status: status,
        lastActive: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await UserAuth.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

export const bulkActionUsers = async (req: Request, res: Response) => {
  try {
    const { userIds, action } = req.body;
    
    switch (action) {
      case 'delete':
        await UserAuth.deleteMany({ _id: { $in: userIds } });
        break;
      case 'deactivate':
        await UserAuth.updateMany(
          { _id: { $in: userIds } },
          { isActive: false }
        );
        break;
      case 'activate':
        await UserAuth.updateMany(
          { _id: { $in: userIds } },
          { isActive: true }
        );
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.json({ message: 'Bulk action completed successfully' });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ message: 'Error performing bulk action' });
  }
};
