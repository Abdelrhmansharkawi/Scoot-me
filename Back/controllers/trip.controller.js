const Trip = require('../models/Trip');
const Scooter = require('../models/scooter');
const { getRouteInfo } = require('../services/routing.service');
const { calculateCost } = require('../utils/costCalculator');

const normalizePoint = (point, label = 'point') => {
	// 1. Check if point exists
	if (!point || !point.coordinates || point.coordinates.length !== 2) {
		console.warn(
			`⚠️ Missing or invalid coordinates for ${label}. Using fallback.`
		);
		return { lat: 30.0444, lng: 31.2357 };
	}
	return {
		lat: point.coordinates[1],
		lng: point.coordinates[0],
	};
};

const confirmDestination = async (req, res) => {
	try {
		const id = req.params.tripId || req.params.id;
		const { latitude, longitude, locationName } = req.body;
		if (!latitude || !longitude) {
			return res
				.status(400)
				.json({ message: 'Destination coordinates required' });
		}
		const trip = await Trip.findById(id);
		if (!trip) return res.status(404).json({ message: 'Trip not found' });
		const allowedStatuses = ['BOOKED', 'RESERVED', 'ONGOING'];
		if (!allowedStatuses.includes(trip.status)) {
			return res.status(400).json({
				message: `Cannot set destination for trip with status: ${trip.status}`,
			});
		}
		const startCoords = normalizePoint(trip.startLocation);
		const endCoords = { lat: latitude, lng: longitude };
		// Get distance/duration from OSRM/Routing service
		const routeInfo = await getRouteInfo(startCoords, endCoords);

		// Update Trip document
		trip.endLocation = {
			type: 'Point',
			coordinates: [longitude, latitude],
			endLocationName: locationName || 'Selected Destination',
		};

		trip.duration = routeInfo.duration;
		await trip.save();
		res.status(200).json({
			message: 'Destination confirmed',
			trip: {
				...trip.toObject(),
				startLocation: startCoords,
				endLocation: endCoords,
			},
		});
	} catch (error) {
		console.error('Confirm Destination Error:', error);
		res
			.status(500)
			.json({ message: 'Server error while confirming destination' });
	}
};

const getTripById = async (req, res) => {
	try {
		// Robust parameter check: handles /api/trips/:id OR /api/trips/:tripId
		const id = req.params.tripId || req.params.id;
		const trip = await Trip.findById(id)
			.populate('scooterId', 'batteryLevel status')
			.lean();
		if (!trip) {
			return res.status(404).json({ message: 'Trip not found' });
		}
		const routeArray = Array.isArray(trip.route) ? trip.route : [];
		// Construct a clean, flat response for the frontend
		const responseData = {
			...trip,
			startLocation: normalizePoint(trip.startLocation),
			endLocation: trip.endLocation ? normalizePoint(trip.endLocation) : null,
			currentLocation: routeArray.length
				? normalizePoint(
						{ coordinates: routeArray[routeArray.length - 1].coordinates },
						'currentLocation'
				  )
				: normalizePoint(trip.startLocation),
			battery: trip.scooterId?.batteryLevel || 0,
			scooterStatus: trip.scooterId?.status || 'Unknown',
		};
		res.status(200).json(responseData);
	} catch (error) {
		console.error('Fetch Trip Error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

///////////////////////////////////////////////////////////////////////////////

const startTrip = async (req, res) => {
	try {
		const { tripId } = req.params;
		const userId = req.user.id; // from auth middleware
		const trip = await Trip.findById(tripId);

		if (!trip) {
			return res.status(404).json({ message: 'Trip not found' });
		}
		// Security: make sure user owns the trip
		if (trip.userId.toString() !== userId) {
			return res.status(403).json({ message: 'Unauthorized trip access' });
		}
		// Destination must be set first
		if (!trip.endLocation || !trip.endLocation.coordinates) {
			return res
				.status(400)
				.json({ message: 'Destination must be confirmed first' });
		}
		// Prevent double start
		if (trip.status === 'ONGOING') {
			return res.status(400).json({ message: 'Trip already started' });
		}
		// Update trip state
		trip.status = 'ONGOING';
		trip.startTime = new Date();
		// Initialize route tracking if empty
		if (!trip.route || trip.route.length === 0) {
			trip.route = [
				{
					coordinates: trip.startLocation.coordinates,
					timestamp: new Date(),
				},
			];
		}
		await trip.save();
		return res.status(200).json({
			message: 'Trip started successfully',
			tripId: trip._id,
			startTime: trip.startTime,
		});
	} catch (error) {
		console.error('Start Trip Error:', error);
		return res.status(500).json({ message: 'Failed to start trip' });
	}
};

//////////////////////////////////////////////////////////////////////////////

// Haversine formula (meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
	const R = 6371000; // meters
	const toRad = (v) => (v * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const updateLiveLocation = async (req, res) => {
	try {
		const { tripId } = req.params;
		const { lat, lng } = req.body;
		const userId = req.user.id;
		if (!lat || !lng) {
			return res.status(400).json({ message: 'Location required' });
		}
		const trip = await Trip.findById(tripId);
		if (!trip) {
			return res.status(404).json({ message: 'Trip not found' });
		}
		if (trip.userId.toString() !== userId) {
			return res.status(403).json({ message: 'Unauthorized' });
		}
		if (trip.status !== 'ONGOING') {
			return res.status(400).json({ message: 'Trip not active' });
		}
		const now = new Date();
		/* -------- Distance Calculation -------- */
		let increment = 0;
		if (trip.route.length > 0) {
			const last = trip.route[trip.route.length - 1].coordinates;
			increment = getDistance(last[1], last[0], lat, lng);
		}
		/* -------- Save New Location -------- */
		trip.route.push({
			coordinates: [lng, lat],
			timestamp: now,
		});

		const routeInfo = await getRouteInfo(
			{ lat, lng },
			{
				lat: trip.endLocation.coordinates[1],
				lng: trip.endLocation.coordinates[0],
			}
		);
		trip.distance = (trip.distance || 0) + increment;
		trip.duration = Math.floor((now - trip.startTime) / 1000);
		trip.distanceRemainingKm = Number((routeInfo.distance / 1000).toFixed(2));
		trip.minsRemaining = Math.ceil(routeInfo.duration / 60);
		trip.estimatedArrival = new Date(Date.now() + routeInfo.duration * 1000);
		// Calculate live cost
		trip.fare.amount = calculateCost(trip.startTime);
		await trip.save();
		return res.status(200).json({
			time: trip.duration,
			distance: trip.distance,
			cost: trip.fare.amount,
			distanceRemainingKm: trip.distanceRemainingKm,
			minsRemaining: trip.minsRemaining,
			estimatedArrival: trip.estimatedArrival,
		});
	} catch (error) {
		console.error('Live Location Error:', error);
		return res.status(500).json({ message: 'Failed to update location' });
	}
};

const endTrip = async (req, res) => {
	try {
		const { tripId } = req.params;
		const userId = req.user.id;

		const trip = await Trip.findById(tripId).populate('scooterId');

		if (!trip) {
			return res.status(404).json({ message: 'Trip not found' });
		}

		/* -------- Ownership Check -------- */
		if (trip.userId.toString() !== userId) {
			return res.status(403).json({ message: 'Unauthorized access' });
		}

		/* -------- Status Check -------- */
		if (trip.status !== 'ONGOING') {
			return res.status(400).json({ message: 'Trip is not ongoing' });
		}

		const endTime = new Date();

		/* -------- Final Calculations -------- */
		const durationSec = Math.floor((endTime - trip.startTime) / 1000);

		const finalFare = calculateCost(trip.startTime);

		/* -------- Update Trip -------- */
		trip.status = 'COMPLETED';
		trip.endTime = endTime;
		trip.duration = durationSec;
		trip.fare.amount = finalFare;
		trip.paymentStatus = 'PENDING';

		/* -------- Release Scooter -------- */
		if (trip.scooterId) {
			const scooter = trip.scooterId;

			scooter.status = 'Available';
			scooter.currentTrip = null;
			scooter.bookedBy = null;

			await scooter.save();
		}

		await trip.save();

		return res.status(200).json({
			message: 'Trip ended successfully',
			summary: {
				tripId: trip._id,
				duration: durationSec,
				distance: trip.distance,
				fare: {
					amount: trip.fare.amount,
					currency: trip.fare.currency,
				},
				startTime: trip.startTime,
				endTime: trip.endTime,
			},
		});
	} catch (error) {
		console.error('End Trip Error:', error);
		return res.status(500).json({ message: 'Failed to end trip' });
	}
};

module.exports = {
	confirmDestination,
	getTripById,
	startTrip,
	updateLiveLocation,
	endTrip,
};
