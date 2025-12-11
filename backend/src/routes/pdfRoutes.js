import express from 'express';
import { generateOutputPdfBuffer } from '../pdf/generateOutputPdf.js';
import { uploadToS3 } from '../services/s3.js';
import Document from '../models/Document.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/generate-output-pdf
router.post('/generate-output-pdf', authMiddleware, async (req, res) => {
  try {
    const { pages } = req.body || {};

    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ message: 'pages array is required' });
    }

    // 1) Build PDF buffer via Puppeteer
    const pdfBuffer = await generateOutputPdfBuffer(pages);

    // 2) Upload to S3
    const { key, url } = await uploadToS3(pdfBuffer, 'application/pdf', 'generated/output/');

    // 3) Create Document record
    const doc = await Document.create({
      title: 'Generated Output',
      fileKey: key,
      fileUrl: url,
      totalPrints: 0,
      createdBy: req.user._id,
      mimeType: 'application/pdf',
      documentType: 'generated-output',
    });

    return res.status(201).json({
      success: true,
      fileKey: key,
      fileUrl: url,
      documentId: doc._id,
    });
  } catch (err) {
    console.error('generate-output-pdf error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
