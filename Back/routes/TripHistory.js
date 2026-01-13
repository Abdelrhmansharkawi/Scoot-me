const express = require('express');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /api/history
| Fetch all trips for the authenticated user
|--------------------------------------------------------------------------
*/
router.get('/', auth, async (req, res) => {
	try {
		const history = await Trip.find({ userId: req.user.id })
			.populate('scooterId')
			.sort({ endTime: -1 });

		res.json(history);
	} catch (err) {
		console.error('Trip fetch error:', err);
		res.status(500).json({ message: 'Failed to fetch trip history' });
	}
});

/*
|--------------------------------------------------------------------------
| GET /api/history/:tripId/details
| Fetch full details for a single trip
| Ride details
|--------------------------------------------------------------------------
*/
router.get('/:tripId/details', auth, async (req, res) => {
	try {
		const { tripId } = req.params;

		const trip = await Trip.findOne({
			_id: tripId,
			userId: req.user.id, // make sure user owns the trip
		}).populate('scooterId', 'scooterName scooterNumber');

		if (!trip) {
			return res.status(404).json({ message: 'Trip not found' });
		}

		// Date formatters
		const formatDate = (d) =>
			new Date(d).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			});

		const formatTime = (d) =>
			new Date(d).toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: 'numeric',
			});

		// Build final response exactly for your UI
		const response = {
			tripId: trip._id,

			// Ride Status
			status: trip.status,
			isPaid: trip.paymentStatus === 'COMPLETED',

			// Date & Times
			date: formatDate(trip.startTime),
			startTime: formatTime(trip.startTime),
			endTime: trip.endTime ? formatTime(trip.endTime) : null,

			// Location names for your UI
			from: trip.startLocation.startLocationName,
			to: trip.endLocation?.endLocationName || 'Unknown',

			// Metrics
			distanceKm: trip.distance,
			durationMin: trip.duration,
			avgSpeedKmh:
				trip.duration > 0
					? (trip.distance / (trip.duration / 60)).toFixed(1)
					: 0,

			// Fare
			totalFare: trip.fare.amount,
			currency: trip.fare.currency,

			// Coordinates for maps
			coordinates: {
				start: trip.startLocation.coordinates,
				end: trip.endLocation?.coordinates || [],
				route: trip.route || [],
			},
		};

		res.json(response);
	} catch (err) {
		console.error('Trip details fetch error:', err);
		res.status(500).json({ message: 'Failed to fetch trip details' });
	}
});

module.exports = router;
