const express = require('express');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/history - Get trips for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const history = await Trip.find({ userId: req.user.id }) // <-- filter by user
      .populate('scooterId')
      .sort({ endTime: -1 });

    res.json(history);
  } catch (err) {
    console.error("Trip fetch error:", err);
    res.status(500).json({ message: 'Failed to fetch trip history' });
  }
});

module.exports = router;