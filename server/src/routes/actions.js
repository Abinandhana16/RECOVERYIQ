const express = require('express');
const RecoveryAction = require('../models/RecoveryAction');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all action routes with JWT
router.use(authMiddleware);

/**
 * GET /api/actions
 * Fetch all recovery actions across all cases, populated with case & customer details
 * Supports optional filters: action_type, outcome
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.action_type) {
      filter.action_type = req.query.action_type;
    }
    if (req.query.outcome) {
      filter.outcome = req.query.outcome;
    }

    const actions = await RecoveryAction.find(filter)
      .populate({
        path: 'case_id',
        populate: {
          path: 'customer_id',
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      total: actions.length,
      actions,
    });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch recovery actions' });
  }
});

module.exports = router;
