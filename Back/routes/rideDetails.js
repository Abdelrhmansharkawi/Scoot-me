const express = require('express');
const router = express.Router();
const { getRideDetails } = require('../controllers/rideController');
const auth = require('../middleware/auth'); // Optional: protect route

// GET /api/rides/:id
router.get('/:id', auth, getRideDetails);

module.exports = router;
