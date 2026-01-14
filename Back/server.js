require('dotenv').config(); // Load env vars from .env

const express = require('express');
const connectDB = require('./config/database');
const mongoose = require('mongoose');
const cors = require('cors');

// Create Express app
const app = express();

// Trust NGINX proxy (important if you add cookies or HTTPS later)
app.set('trust proxy', 1);

// Middleware
app.use(express.json());

// Import models
const User = require('./models/User');
const Scooter = require('./models/scooter');
const Trip = require('./models/Trip');
const Payment = require('./models/payment');
const Review = require('./models/Review');

// CORS configuration with preflight handling
const corsOptions = {
	origin: ['http://localhost:5173', 'https://scoot-me-j98i.vercel.app'],
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// Import routes
const authRoutes = require('./routes/auth');
const scooterRoutes = require('./routes/scooter');
const historyRoutes = require('./routes/TripHistory');
const resetRoutes = require('./routes/passReset');
const pythonExtractRoutes = require('./routes/pythonExtract');
const userRoutes = require('./routes/User');
const rideRoutes = require('./routes/rideDetails');
const destinationRoutes = require('./routes/trip.routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', destinationRoutes);
app.use('/api/scooter', scooterRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', resetRoutes);
app.use('/api/pyqr', pythonExtractRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rides', rideRoutes);

// Test route
app.get('/', (req, res) => {
	res.json({ message: 'API is working' });
});

// Start server after DB connection
const PORT = process.env.PORT || 5000;

connectDB()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	})
	.catch((error) => {
		console.error('Failed to start server:', error);
	});
