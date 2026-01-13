const Trip = require('../models/Trip');
const Scooter = require('../models/scooter');
const Payment = require('../models/payment');

// GET /api/rides/:id
exports.getRideDetails = async (req, res) => {
	try {
		const tripId = req.params.id;

		// 1️⃣ Fetch trip
		const trip = await Trip.findById(tripId);
		if (!trip) return res.status(404).json({ error: 'Trip not found' });

		// 2️⃣ Fetch scooter
		const scooter = await Scooter.findById(trip.scooterId);

		// 3️⃣ Fetch payment
		const payment = await Payment.findOne({ tripId });

		// --- HELPER FUNCTIONS ---
		// Ensures 2 decimal places and handles floating point errors
		const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

		// --- CALCULATIONS ---
		// 1. Convert meters to km (Forces number type with parseFloat)
		const distKm = round(parseFloat(trip.distance || 0) / 1000);

		// 2. Convert seconds to minutes
		const durMin = round((trip.duration || 0) / 60);

		// 3. Calculate Speed (km/h)
		const durationInHours = (trip.duration || 0) / 3600;
		let avgSpeed = durationInHours > 0 ? round(distKm / durationInHours) : 0;

		// 4️⃣ Format response
		const response = {
			status: trip.status || 'Completed Ride',
			paymentStatus: trip?.paymentStatus === 'COMPLETED' ? 'Paid' : 'Unpaid',

			date: new Date(trip.startTime).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			}),

			timeRange: `${new Date(trip.startTime).toLocaleTimeString([], {
				hour: 'numeric',
				minute: '2-digit',
			})} - ${
				trip.endTime
					? new Date(trip.endTime).toLocaleTimeString([], {
							hour: 'numeric',
							minute: '2-digit',
					  })
					: 'Ongoing'
			}`,

			// Corrected Distance and Units
			distance: `${distKm} km`,
			duration: `${durMin} min`,
			avgSpeed: `${avgSpeed} km/h`,

			batteryUsed: `${Math.round(trip.batteryUsed || 0)}%`,

			// Switched to EGP
			totalCost: `EGP ${round(trip.fare?.amount || 0)}`,

			startLocation: trip.startLocation?.startLocationName || 'Unknown',
			endLocation: trip.endLocation?.endLocationName || 'Unknown',

			scooter: {
				id: scooter?.scooterNumber || 'Unknown',
				model: scooter?.scooterName || 'Unknown Model',
				batteryLevel: `${Math.round(scooter?.batteryLevel || 0)}%`,
			},

			breakdown: {
				baseFare: `EGP ${round(payment?.fareBreakdown?.base || 0)}`,
				distanceFare: `EGP ${round(payment?.fareBreakdown?.distance || 0)}`,
				timeFare: `EGP ${round(payment?.fareBreakdown?.time || 0)}`,
			},
		};

		res.json(response);
	} catch (err) {
		console.error('Ride details fetch error:', err);
		res.status(500).json({ error: 'Server error' });
	}
};
