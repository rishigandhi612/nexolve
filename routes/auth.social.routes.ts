import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import UserAuth from '../models/UserAuth';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface FacebookUserData {
  id: string;
  email: string;
  name: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

// Google Sign In
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid token payload');
    }

    // Check if user exists
    let user = await UserAuth.findOne({ email: payload.email });

    if (!user) {
      // Create new user
      user = new UserAuth({
        email: payload.email,
        fullName: payload.name,
        profilePic: payload.picture,
        // Generate a random password for social auth users
        password: Math.random().toString(36).slice(-8)
      });
      await user.save();
    }

    // Generate JWT token
    const authToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

// Facebook Sign In
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    // Verify Facebook token and get user data
    const response = await axios.get<FacebookUserData>(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const data = response.data;

    if (!data.email) {
      throw new Error('Email not provided by Facebook');
    }

    // Check if user exists
    let user = await UserAuth.findOne({ email: data.email });

    if (!user) {
      // Create new user
      user = new UserAuth({
        email: data.email,
        fullName: data.name,
        profilePic: data.picture?.data?.url,
        // Generate a random password for social auth users
        password: Math.random().toString(36).slice(-8)
      });
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(401).json({ message: 'Facebook authentication failed' });
  }
});

export default router;