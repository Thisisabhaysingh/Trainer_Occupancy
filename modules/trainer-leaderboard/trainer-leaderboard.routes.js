const express = require('express');
const { auth, checkRole } = require('../../middleware/auth');
const { getLeaderboard, recomputeLeaderboard, currentPeriodKey, isPeriodKey } = require('../../services/trainerLeaderboardService');

const router = express.Router();
router.use(auth);

// Live monthly leaderboard: top trainers plus the requesting user's own standing.
router.get('/', async (req, res) => {
  try {
    const periodKey = req.query.period || currentPeriodKey();
    if (!isPeriodKey(periodKey)) return res.status(400).json({ error: 'Period must be in YYYY-MM format.' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    return res.json(await getLeaderboard({ periodKey, userId: req.user.employeeCode, limit }));
  } catch (error) {
    console.error('Error loading trainer leaderboard:', error);
    return res.status(500).json({ error: 'Failed to load the trainer leaderboard.' });
  }
});

router.post('/recompute', checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const periodKey = req.body?.period || currentPeriodKey();
    if (!isPeriodKey(periodKey)) return res.status(400).json({ error: 'Period must be in YYYY-MM format.' });
    await recomputeLeaderboard(periodKey);
    return res.json(await getLeaderboard({ periodKey, userId: req.user.employeeCode, limit: 100 }));
  } catch (error) {
    console.error('Error recomputing trainer leaderboard:', error);
    return res.status(500).json({ error: 'Failed to recompute the trainer leaderboard.' });
  }
});

module.exports = router;
