const mongoose = require('mongoose');

// --------------------- Users ---------------------
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true
  },
  profilePicture: {
    url: {
        type: String,
        default: 'default-profile.png'  // Default profile picture
    }
  },

  collegeIdImage: {
    url: String,
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING'
    },
    verifiedAt: Date
  },
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
    default: 'INACTIVE'
  }
}, {
  timestamps: true
});

// --------------------- Scooters ---------------------

const scooterSchema = new mongoose.Schema({
    scooterNumber: {
        type: String,
        required: true,
        unique: true,
    },
    qrCode: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OFFLINE'],
    default: 'AVAILABLE'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  lastMaintenance: Date,
  currentTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  }
}, {
  timestamps: true
});


// --------------------- Trips ---------------------

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
            default: null
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

// --------------------- Payment ---------------------

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    amount: {
        value: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'EGP'
        }
    },
    paymentMethod: {
        type: String,
        enum: ['CREDIT_CARD', 'DEBIT_CARD', 'WALLET','DIGITAL_WALLET'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'PENDING'
    },
    transactionId: {
        type: String,
        unique: true
    },
    paymentDetails: {
        cardLast4: String,
        cardType: String,
        paymentGateway: String
    },
    refund: {
        status: String,
        amount: Number,
        reason: String,
        processedAt: Date
    }
}, {
    timestamps: true
});

// --------------------- Reviews ---------------------

const ReviewSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    tripId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Trip', 
        required: true 
    },
    rating: { 
        type: Number, 
        min: 1, max: 5, 
        required: true 
    },
    comment: { 
        type: String,
        maxLength: 500
    },
    issues: [{
        type: String,
        enum: [
            'BATTERY',
            'BRAKES',
            'WHEELS',
            'LIGHTS',
            'QR_CODE',
            'APP_ISSUES',
            'OTHER'
        ]
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
  });

// --------------------- Indexes ---------------------

// User Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ studentId: 1 }, { unique: true });

// Scooter Indexes
scooterSchema.index({ qrCode: 1 }, { unique: true });
scooterSchema.index({ location: '2dsphere' });
scooterSchema.index({ status: 1 });

// Trip Indexes
tripSchema.index({ userId: 1, startTime: -1 });
tripSchema.index({ scooterId: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ startLocation: '2dsphere' });
tripSchema.index({ endLocation: '2dsphere' });

// Payment Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ tripId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ status: 1 });

// Review Indexes
ReviewSchema.index({ userId: 1, tripId: 1 }, { unique: true });
ReviewSchema.index({ scooterId: 1 });
ReviewSchema.index({ rating: 1 });


const User = mongoose.model('User', userSchema);
const Scooter = mongoose.model('Scooter', scooterSchema);
const Trip = mongoose.model('Trip', tripSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Review = mongoose.model('Review', ReviewSchema);

module.exports = {
    User,
    Scooter,
    Trip,
    Payment,
    Review
};
  