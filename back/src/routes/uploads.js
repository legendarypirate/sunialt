const express = require('express');
const multer = require('multer');
const { authenticateAdmin } = require('../middleware/auth');
const { configured, uploadBuffer } = require('../utils/cloudinary');

const router = express.Router();
router.use(authenticateAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

router.post('/image', upload.single('file'), async (req, res) => {
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
