// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authController = {
	// Register
	register: async (req, res) => {
		try {
			const { firstName, lastName, email, password } = req.body;

			const userExists = await User.findOne({ email });
			if (userExists) {
				return res.status(400).json({ message: 'User already exists' });
			}

			const user = await User.create({
				firstName,
				lastName,
				email,
				password,
			});

			const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
				expiresIn: '1d',
			});

			res.status(201).json({
				success: true,
				data: {
					user: {
						id: user._id,
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
					},
					token,
				},
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				message: error.message,
			});
		}
	},

	// Login user
	login: async (req, res) => {
		try {
			const { email, password } = req.body;

			// Check if user exists
			const user = await User.findOne({ email });
			if (!user) {
				return res.status(401).json({ message: 'Invalid credentials' });
			}

			// Check password
			const isMatch = await user.comparePassword(password);
			if (!isMatch) {
				return res.status(401).json({ message: 'Wrong Password!' });
			}

			// Generate token
			const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
				expiresIn: '1d',
			});

			res.json({
				success: true,
				data: {
					user: {
						id: user._id,
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
						studentId: user.studentId,
					},
					token,
				},
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				message: error.message,
			});
		}
	},

	// Get current user profile
	getProfile: async (req, res) => {
		try {
			const user = await User.findById(req.user.id).select('-password');

			if (!user) {
				return res.status(404).json({
					success: false,
					message: 'User not found',
				});
			}

			res.json({
				success: true,
				data: {
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					studentId: user.studentId || null,

					// 👇 REAL VALUES FROM DATABASE
					settings: {
						pushNotifications: user.settings?.pushNotifications,
						emailNotifications: user.settings?.emailNotifications,
						rideReminders: user.settings?.rideReminders,
					},
				},
			});
		} catch (error) {
			res.status(400).json({
				success: false,
				message: error.message,
			});
		}
	},
};

module.exports = authController;
