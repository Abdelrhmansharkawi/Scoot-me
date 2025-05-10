const mongoose = require('mongoose');

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
  
  module.exports = mongoose.model('Review', ReviewSchema);
  