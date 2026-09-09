const express = require('express');
const mlClient = require('../services/mlClient');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect ML routes with JWT
router.use(authMiddleware);

/**
 * GET /api/ml/model-metrics
 * Proxy to fetch trained ML model metrics and feature importances
 */
router.get('/model-metrics', async (req, res) => {
  try {
    const metrics = await mlClient.getModelMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching ML metrics:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch ML model metrics' });
  }
});

module.exports = router;
