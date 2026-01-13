const express = require('express');
const router = express.Router();
const {
	confirmDestination,
	getTripById,
	startTrip,
	updateLiveLocation,
	endTrip,
} = require('../controllers/trip.controller.js');
const auth = require('../middleware/auth.js');

router.post('/:tripId/destination', auth, confirmDestination);

router.get('/:tripId', auth, getTripById);

router.post('/:tripId/start', auth, startTrip);

router.post('/:tripId/location', auth, updateLiveLocation);

router.post('/:tripId/end', auth, endTrip);

module.exports = router;
