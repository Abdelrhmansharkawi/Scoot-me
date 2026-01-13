import User from '../models/User.js';

export const updateSettings = async (req, res) => {
	try {
		const userId = req.user.id; 

		const { pushNotifications, emailNotifications, rideReminders } = req.body;

		// Validate required fields
		if (
			pushNotifications === undefined ||
			emailNotifications === undefined ||
			rideReminders === undefined
		) {
			return res.status(400).json({
				success: false,
				message: 'All settings must be provided.',
			});
		}

		// Update settings inside user
		const updatedUser = await User.findByIdAndUpdate(
			userId,
			{
				$set: {
					'settings.pushNotifications': pushNotifications,
					'settings.emailNotifications': emailNotifications,
					'settings.rideReminders': rideReminders,
				},
			},
			{ new: true }
		);

		if (!updatedUser) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			});
		}

		// Format response like frontend needs
		return res.json({
			success: true,
			message: 'Settings updated successfully',
			user: {
				firstName: updatedUser.firstName,
				lastName: updatedUser.lastName,
				email: updatedUser.email,
				studentId: updatedUser.studentId,
				settings: updatedUser.settings,
			},
		});
	} catch (err) {
		console.log('Settings update error:', err);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};
