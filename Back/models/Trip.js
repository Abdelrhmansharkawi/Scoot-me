const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    scooterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scooter',
        required: true
    },

    // Trip start time
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Trip end time (null until trip ends)
    endTime: {
        type: Date,
        default: null
    },

    // Starting location (GeoJSON format)
    startLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],  // [longitude, latitude]
            required: true
        },
        startLocationName: {
            type: String,
            required: true 
        }
    },

    // Ending location (GeoJSON format)
    endLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],  // [longitude, latitude]
            default: []
        },
        endLocationName: {
            type: String,
            required: false // Set to false if locationName is not required
        }
    },

    status: {
        type: String,
        enum: ['ONGOING', 'COMPLETED', 'CANCELLED'],
        default: 'ONGOING'
    },

    distance: {
        type: Number,
        default: 0
    },

    duration: {
        type: Number,
        default: 0
    },

    fare: {
        amount: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'EGP'
        }
    },

    paymentStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'PENDING'
    },

    // Route taken during trip (array of coordinates)
    route: {
        type: [{
            coordinates: {
                type: [Number],  // [longitude, latitude]
                required: true
            },
            timestamp: {
                type: Date,
                required: true
            }
        }],
        default: []
    }
}, {
    timestamps: true  
});

tripSchema.index({ userId: 1, startTime: -1 });
tripSchema.index({ scooterId: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ startLocation: '2dsphere' });
tripSchema.index({ endLocation: '2dsphere' });

module.exports = mongoose.model('Trip', tripSchema);
