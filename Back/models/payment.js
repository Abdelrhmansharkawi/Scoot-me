const mongoose = require('mongoose');

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

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ tripId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);