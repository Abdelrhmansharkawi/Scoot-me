const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const User = require('../models/User'); // ✅ Add your User model
const requireAuth = require('../middleware/auth'); // ✅ Auth middleware

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/test', (req, res) => {
  res.json({ message: 'QR Extract route is working!' });
});

// ✅ Protected route with auth
router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;

  const python = spawn('python', ['extract_data.py', imagePath]);

  let dataString = '';
  python.stdout.on('data', (data) => {
    dataString += data.toString();
  });

  python.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  python.on('close', async (code) => {
    fs.unlinkSync(imagePath); // delete uploaded image

    let parsed;
    try {
      parsed = JSON.parse(dataString);
    } catch (err) {
      console.error("❌ Failed to parse data from Python script:", err);
      return res.status(500).json({ error: 'Failed to parse data from Python script.' });
    }

    try {
      const userId = req.user.id; // ✅ From requireAuth
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      user.verifiedStudentData = {
        studentName: parsed.student_name,
        studentNumber: parsed.student_number,
        college: parsed.college,
        yearLevel: parsed.year_level,
        enrollmentStatus: parsed.enrollment_status || 'Unknown',
        verifiedFromQR: true
      };

      user.qrScanSource = parsed.error ? null : parsed.url || null;

      await user.save();

      res.json({
        message: 'Student data extracted and saved successfully',
        data: user.verifiedStudentData
      });
    } catch (err) {
      console.error("❌ Error saving user data:", err);
      res.status(500).json({ error: 'Internal server error while updating user.' });
    }
  });
});

module.exports = router;

