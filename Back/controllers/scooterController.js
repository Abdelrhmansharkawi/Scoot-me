const Scooter = require('../models/scooter.js');
const User = require('../models/User');
const Trip = require('../models/Trip.js');
const mongoose = require('mongoose');

// Get all scooters
const getScooters = async (req, res) => {
	try {
		const scooters = await Scooter.find();
		res.json(scooters);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

// Book a scooter
const bookScooter = async (req, res) => {
	try {
		const scooter = await Scooter.findById(req.params.id);
		if (!scooter) return res.status(404).json({ message: 'Scooter not found' });

		if (scooter.status !== 'Available') {
			return res
				.status(400)
				.json({ message: 'Scooter not available for booking' });
		}

		const user = await User.findById(req.user.id);

		if (!user) {
			return res
				.status(401)
				.json({ message: 'User not found or not authorized' });
		}

		scooter.status = 'Reserved';
		scooter.lastBookedAt = new Date();
		scooter.bookedBy = user._id;
		await scooter.save();

		// Save the booking history
		const trip = new Trip({
			userId: req.user.id,
			scooterId: scooter._id,
			startLocation: {
				type: 'Point',
				coordinates: scooter.location.coordinates,
				startLocationName: scooter.location.locationName,
			},
			endLocation: null,
			startTime: new Date(),
			status: 'BOOKED',
			fare: {
				amount: 0,
				currency: 'EGP',
			},
		});

		await trip.save();

		res.json({ message: 'Scooter booked successfully', scooter, trip });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

//verivy scooter
// controllers/scooterController.js

const verifyScooter = async (req, res) => {
	try {
		const { id } = req.params; // This is the 'qrCode' string from the scanner
		const userId = req.user.id; // This is usually a string from the JWT middleware

		// 1. Find scooter using the qrCode field
		const scooter = await Scooter.findOne({ qrCode: id });

		if (!scooter) {
			return res
				.status(404)
				.json({ message: 'Scooter not found. Check the QR code.' });
		}

		// 2. Validate Ownership
		// Since bookedBy is a String in your model, we compare directly.
		if (
			!scooter.bookedBy ||
			scooter.bookedBy.toString() !== userId.toString()
		) {
			return res.status(403).json({
				message:
					'Unauthorized: You do not have an active reservation for this scooter.',
			});
		}

		// 3. Find the Trip
		// Use the scooter's actual database _id to find the trip
		const trip = await Trip.findOne({
			scooterId: scooter._id, // Use the ID found from the QR search
			userId: userId,
			status: 'BOOKED',
		}).sort({ createdAt: -1 });

		if (!trip) {
			return res.status(404).json({
				message: 'Trip record not found. Please re-book the scooter.',
			});
		}

		// 4. Send success
		res.json({
			success: true,
			tripId: trip._id.toString(),
			scooter,
		});
	} catch (err) {
		console.error('Backend Error:', err);
		res.status(500).json({ message: 'Server error during verification' });
	}
};

module.exports = { getScooters, bookScooter, verifyScooter };
