const mongoose = require('mongoose');

const scooterSchema = new mongoose.Schema(
	{
		scooterName: {
			type: String,
			required: true,
		},
		scooterNumber: {
			type: String,
			required: true,
			unique: true,
		},
		qrCode: {
			type: String,
			required: true,
			unique: false,
		},
		status: {
			type: String,
			enum: ['Available', 'In Use', 'Reserved', 'Maintenance', 'Offline'],
			default: 'Available',
		},
		batteryLevel: {
			type: Number,
			min: 0,
			max: 100,
			required: true,
		},
		location: {
			type: {
				type: String,
				enum: ['Point'],
				default: 'Point',
			},
			coordinates: {
				type: [Number],
				required: true,
			},
			locationName: {
				type: String,
				required: true,
			},
		},
		lastMaintenance: Date,
		currentTrip: {
			type: String,
			ref: 'Trip',
		},
		bookedBy: {
			type: String,
			ref: 'User',
		},
	},
	{
		timestamps: true,
	}
);

// Create geospatial index
scooterSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Scooter', scooterSchema);
scooterSchema.index({ status: 1 });
