const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'No user found with this email.' });

        const newPassword = crypto.randomBytes(8).toString('base64'); // 12-character password
        user.password = newPassword;

        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
            user: 'abdelrhmansharkawi@gmail.com',
            pass: 'ffww avhe iukq ynoe',
        },
    });

    const mailOptions = {
        from: '"Scoot-Me" <your-email@gmail.com>',
        to: user.email,
        subject: 'Your Password Has Been Reset',
        html: `
            <p>Hello ${user.firstName},</p>
            <p>Your password has been reset. Here is your new temporary password:</p>
            <p style="font-weight:bold;">${newPassword}</p>
            <p>Please log in and change your password immediately.</p>
        `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Random password generated, updated, and sent to user.' });
    } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
    }
});

module.exports = router;
