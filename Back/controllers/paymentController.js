const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/payment');

// ENV VARIABLES
const FAWRY_MERCHANT_CODE = process.env.FAWRY_MERCHANT_CODE;
const FAWRY_SECURITY_KEY = process.env.FAWRY_SECURITY_KEY;
const FAWRY_BASE_URL =
	'https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments/charge';

// -----------------------------------------------------------------------------
// 🔵 Generate Signature
// -----------------------------------------------------------------------------
function generateSignature(merchantCode, merchantRefNum, amount, securityKey) {
	return crypto
		.createHash('sha256')
		.update(merchantCode + merchantRefNum + amount + securityKey)
		.digest('hex');
}

// -----------------------------------------------------------------------------
// 🔵 1. CREATE PAYMENT (User completes ride → backend generates Fawry payment)
// -----------------------------------------------------------------------------
exports.createPayment = async (req, res) => {
	try {
		const { userId, tripId, amount } = req.body;
		const merchantRefNum = crypto.randomUUID(); // your unique reference

		// Generate Fawry signature
		const signature = generateSignature(
			FAWRY_MERCHANT_CODE,
			merchantRefNum,
			amount.toFixed(2),
			FAWRY_SECURITY_KEY
		);

		// Create DB record first
		const payment = await Payment.create({
			userId,
			tripId,
			merchantRefNum,
			amount: { value: amount, currency: 'EGP' },
			paymentMethod: 'FAWRY',
			signatureSent: signature,
		});

		// Build Fawry charge body
		const fawryRequestBody = {
			merchantCode: FAWRY_MERCHANT_CODE,
			merchantRefNum: merchantRefNum,
			customerProfileId: userId.toString(),
			paymentMethod: 'CARD',
			amount: amount,
			currencyCode: 'EGP',
			chargeItems: [
				{
					itemId: tripId.toString(),
					description: 'Scooter Trip Payment',
					price: amount,
					quantity: 1,
				},
			],
			signature: signature,
		};

		// Call Fawry Charge API
		const response = await axios.post(FAWRY_BASE_URL, fawryRequestBody);

		// Extract payment URL for frontend redirect
		const paymentUrl = response.data?.paymentUrl;

		// Save to DB
		payment.paymentUrl = paymentUrl;
		await payment.save();

		res.json({
			success: true,
			message: 'Fawry payment created',
			paymentUrl,
			merchantRefNum,
		});
	} catch (err) {
		console.error('Fawry Payment Error:', err.response?.data || err);
		res.status(500).json({
			success: false,
			message: 'Failed to create Fawry payment',
		});
	}
};

// -----------------------------------------------------------------------------
// 🔵 2. FAWRY CALLBACK (Webhook - Fawry notifies backend)
// -----------------------------------------------------------------------------
exports.fawryCallback = async (req, res) => {
	try {
		const callback = req.body;

		const {
			merchantRefNumber,
			fawryRefNumber,
			orderAmount,
			orderStatus,
			signature,
		} = callback;

		// Get payment from DB
		const payment = await Payment.findOne({
			merchantRefNum: merchantRefNumber,
		});

		if (!payment) return res.status(404).json({ message: 'Payment not found' });

		// Save callback
		payment.callbackData = callback;
		payment.referenceNumber = fawryRefNumber;
		payment.fawryStatus = orderStatus;
		payment.signatureReceived = signature;

		// Update payment status
		payment.status = orderStatus === 'PAID' ? 'PAID' : 'FAILED';

		// Save changes
		await payment.save();

		// Respond to Fawry
		res.status(200).send('OK');
	} catch (err) {
		console.error('Callback Error:', err);
		res.status(500).send('ERROR');
	}
};

// -----------------------------------------------------------------------------
// 🔵 3. PAYMENT VERIFICATION (Frontend can check status)
// -----------------------------------------------------------------------------
exports.verifyPayment = async (req, res) => {
	try {
		const { merchantRefNum } = req.params;

		const payment = await Payment.findOne({ merchantRefNum });

		if (!payment) return res.status(404).json({ message: 'Payment not found' });

		res.json({
			merchantRefNum,
			referenceNumber: payment.referenceNumber,
			status: payment.status,
			fawryStatus: payment.fawryStatus,
			paymentUrl: payment.paymentUrl,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Verification failed' });
	}
};
