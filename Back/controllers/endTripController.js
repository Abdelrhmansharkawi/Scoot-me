const Trip = require('../models/Trip');
const Scooter = require('../models/scooter');

const endTrip = async (req, res) => {
	try {
		const userId = req.user.id;
		const { tripId } = req.params;

		// 1. Find the trip
		const trip = await Trip.findById(tripId);
		if (!trip) return res.status(404).json({ message: 'Trip not found' });

		if (trip.userId.toString() !== userId) {
			return res
				.status(403)
				.json({ message: 'You are not allowed to end this trip' });
		}

		if (trip.status !== 'in_progress') {
			return res.status(400).json({ message: 'Trip is already ended' });
		}

		// 2. Find scooter
		const scooter = await Scooter.findById(trip.scooterId);
		if (!scooter) {
			return res.status(404).json({ message: 'Scooter not found' });
		}

		// 3. End time + duration
		const endTime = new Date();
		const durationMinutes = Math.ceil((endTime - trip.startTime) / 60000);

		// Example pricing
		const baseFare = 5; // EGP
		const perMinute = 1.5; // EGP per minute
		const totalFare = baseFare + durationMinutes * perMinute;

		// 4. Update trip
		trip.endTime = endTime;
		trip.totalDuration = durationMinutes;
		trip.fare.amount = totalFare;
		trip.status = 'completed';

		await trip.save();

		// 5. Update scooter to available
		scooter.status = 'available';
		scooter.bookedBy = null;
		scooter.currentTrip = null;

		// Optional: battery drain
		scooter.batteryLevel = Math.max(
			0,
			scooter.batteryLevel - durationMinutes * 0.8
		);

		await scooter.save();

		return res.json({
			message: 'Trip ended successfully',
			trip,
			scooter,
		});
	} catch (err) {
		console.error('End Trip Error:', err);
		res.status(500).json({ message: err.message });
	}
};

module.exports = { endTrip };
