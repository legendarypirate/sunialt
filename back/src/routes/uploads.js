const express = require('express');
const multer = require('multer');
const { authenticateAdmin } = require('../middleware/auth');
const { configured, uploadBuffer } = require('../utils/cloudinary');

const router = express.Router();
router.use(authenticateAdmin);

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `Image file is too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` });
      return;
    }
    res.status(400).json({ error: err.message });
  });
}

router.post('/image', handleUpload, async (req, res) => {
  try {
    if (!configured()) {
      return res.status(503).json({ error: 'Cloudinary is not configured' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = String(req.body.folder || 'sunialt/exercises').trim() || 'sunialt/exercises';
    const result = await uploadBuffer(req.file.buffer, {
      folder,
      resource_type: 'image',
      transformation: [{ width: 1920, crop: 'limit', quality: 'auto:good' }],
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
