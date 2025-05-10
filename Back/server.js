const express = require('express');
const connectDB = require('./config/database');
const mongoose = require('mongoose');
const cors = require("cors");

// Define allowed origins
const allowedOrigins = [
  'https://scoot-me-1-git-main-abdelrhman-al-sharkawis-projects.vercel.app/login',  // Your frontend URL
  'http://localhost:3000',  // Local development URL (if needed)
];

// Import models
const User = require('./models/User');
const Scooter = require('./models/scooter');
const Trip = require('./models/Trip');
const Payment = require('./models/payment');
const Review = require('./models/Review');

// Import routes
const authRoutes = require('./routes/auth');
const scooterRoutes = require('./routes/scooter');
const historyRoutes = require('./routes/Trip');
const resetRoutes = require('./routes/passReset'); 

// Create Express app
const app = express();

// Allow requests from your frontend origin
const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));


// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scooter', scooterRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', resetRoutes); 

// Basic test route
app.get('/', (req, res) => {
    res.json({ message: 'API is working' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(error => {
        console.error('Failed to start server:', error);
    });
