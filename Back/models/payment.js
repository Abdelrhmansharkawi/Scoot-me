const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},

		tripId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Trip',
			required: true,
		},

		amount: {
			value: { type: Number, required: true },
			currency: { type: String, default: 'EGP' },
		},

		paymentMethod: {
			type: String,
			enum: ['FAWRY', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET', 'DIGITAL_WALLET'],
			default: 'FAWRY',
		},

		status: {
			type: String,
			enum: ['PENDING', 'PAID', 'FAILED'],
			default: 'PENDING',
		},

		// Transaction ID from Fawry (referenceNumber)
		referenceNumber: {
			type: String,
			unique: true,
			sparse: true, 
		},

		// unique ID in communication with Fawry
		merchantRefNum: {
			type: String,
			required: true,
			unique: true,
		},

		// Fawry payment URL for redirect
		paymentUrl: {
			type: String,
		},

		// Payment gateway fields
		paymentDetails: {
			cardLast4: String,
			cardType: String,
			paymentGateway: {
				type: String,
				default: 'Fawry',
			},
		},

		// Store raw callback from Fawry
		callbackData: {
			type: Object,
			default: {},
		},

		// Store callback status from Fawry (e.g., PAID, NEW, FAILED)
		fawryStatus: {
			type: String,
		},

		// Signature you send to Fawry
		signatureSent: {
			type: String,
		},

		// Signature Fawry sends back (for debugging)
		signatureReceived: {
			type: String,
		},

		refund: {
			status: String,
			amount: Number,
			reason: String,
			processedAt: Date,
		},
	},
	{
		timestamps: true,
	}
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ tripId: 1 });
paymentSchema.index({ merchantRefNum: 1 }, { unique: true });
paymentSchema.index({ referenceNumber: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
