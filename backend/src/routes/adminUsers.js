import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin creates a new user with email + password
router.post('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'user',
    });

    return res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Admin create user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
