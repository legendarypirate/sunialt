const express = require('express');
const path = require('path');

const router = express.Router();
const publicDir = path.join(__dirname, '..', '..', 'public');

router.get('/privacy', (_req, res) => {
  res.type('html').sendFile(path.join(publicDir, 'privacy.html'));
});

router.get('/privacy/', (_req, res) => {
  res.redirect(301, '/privacy');
});

module.exports = router;
