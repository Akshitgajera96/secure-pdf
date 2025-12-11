import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Document from '../models/Document.js';
import DocumentAccess from '../models/DocumentAccess.js';
import { uploadToS3 } from '../services/s3.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import Session from '../models/Session.js';
import BlockedIp from '../models/BlockedIp.js';

const router = express.Router();
const upload = multer();

// Upload document (PDF/SVG) and create Document record
router.post('/documents', authMiddleware, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, totalPrints } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    if (!title || !totalPrints) {
      return res.status(400).json({ message: 'Title and totalPrints are required' });
    }

    const parsedTotal = Number(totalPrints);
    if (Number.isNaN(parsedTotal) || parsedTotal <= 0) {
      return res.status(400).json({ message: 'totalPrints must be a positive number' });
    }

    const { key, url } = await uploadToS3(file.buffer, file.mimetype);

    const doc = await Document.create({
      title,
      fileKey: key,
      fileUrl: url,
      totalPrints: parsedTotal,
      createdBy: req.user._id,
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Upload document error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/users/:userId/sessions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await Session.find({ userId }).sort({ createdAt: -1 });

    return res.json({ sessions });
  } catch (err) {
    console.error('List user sessions error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/sessions/:sessionId/logout', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Session.deleteOne({ _id: sessionId });

    return res.json({ success: true });
  } catch (err) {
    console.error('Logout session error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/sessions/:sessionId/block-ip', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body || {};

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const ip = session.ip;

    await BlockedIp.findOneAndUpdate(
      { ip },
      {
        ip,
        reason: reason || 'Blocked from admin panel',
        blockedBy: req.user._id,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await Session.deleteMany({ ip });

    return res.json({ success: true });
  } catch (err) {
    console.error('Block IP error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout-all', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await Session.deleteMany({ userId });

    return res.json({ success: true });
  } catch (err) {
    console.error('Logout all devices error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all documents created by admin
router.get('/documents', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const docs = await Document.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    return res.json(docs);
  } catch (err) {
    console.error('List documents error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign or update quota for a user on a document (by userId)
router.post('/documents/:id/assign', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, assignedQuota } = req.body;

    if (!userId || !assignedQuota) {
      return res.status(400).json({ message: 'userId and assignedQuota are required' });
    }

    const parsedQuota = Number(assignedQuota);
    if (Number.isNaN(parsedQuota) || parsedQuota <= 0) {
      return res.status(400).json({ message: 'assignedQuota must be a positive number' });
    }

    const access = await DocumentAccess.findOneAndUpdate(
      { userId, documentId: id },
      { userId, documentId: id, assignedQuota: parsedQuota },
      { upsert: true, new: true }
    );

    return res.json(access);
  } catch (err) {
    console.error('Assign quota error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign or update quota for a user on a document, using user email
router.post('/documents/:id/assign-by-email', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, assignedQuota } = req.body;

    if (!email || !assignedQuota) {
      return res.status(400).json({ message: 'email and assignedQuota are required' });
    }

    const parsedQuota = Number(assignedQuota);
    if (Number.isNaN(parsedQuota) || parsedQuota <= 0) {
      return res.status(400).json({ message: 'assignedQuota must be a positive number' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    const access = await DocumentAccess.findOneAndUpdate(
      { userId: user._id, documentId: id },
      { userId: user._id, documentId: id, assignedQuota: parsedQuota },
      { upsert: true, new: true }
    );

    if (!access.sessionToken) {
      access.sessionToken = crypto.randomBytes(32).toString('hex');
      await access.save();
    }

    return res.json(access);
  } catch (err) {
    console.error('Assign quota by email error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new user (admin only)
router.post('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be either "admin" or "user"' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
    });

    return res.status(201).json({
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Create user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
