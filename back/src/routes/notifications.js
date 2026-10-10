const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const {
  getPushStats,
  getPushJob,
  sendAdminPush,
} = require('../services/adminPushNotifications');

const router = express.Router();
router.use(authenticateAdmin);

function jobMessage(job) {
  if (job.status === 'running') {
    return `${job.tokenCount} төхөөрөмж рүү илгээж байна...`;
  }
  if (job.status === 'failed') {
    return job.error || 'Илгээхэд алдаа гарлаа';
  }
  return `${job.sent} төхөөрөмжид мэдэгдэл илгээгдлээ`;
}

router.get('/stats', async (_req, res) => {
  try {
    const stats = await getPushStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { title, body, data, audience, userId } = req.body || {};
    const job = await sendAdminPush({
      title,
      body,
      data,
      audience: audience || 'all',
      userId,
    });
    res.status(job.status === 'running' ? 202 : 200).json({
      ...job,
      message: jobMessage(job),
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.get('/jobs/:jobId', (req, res) => {
  const job = getPushJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Илгээлт олдсонгүй (сервер дахин асаасан байж магадгүй)' });
  }
  return res.json({ ...job, message: jobMessage(job) });
});

module.exports = router;
