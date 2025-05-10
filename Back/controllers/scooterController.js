const Scooter = require("../models/scooter.js");
const User = require("../models/User"); 
const Trip = require('../models/Trip.js');


// Get all scooters
const getScooters = async (req, res) => {
  try {
    const scooters = await Scooter.find();
    res.json(scooters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Book a scooter
const bookScooter = async (req, res) => {
  try {
    const scooter = await Scooter.findById(req.params.id);
    if (!scooter) return res.status(404).json({ message: "Scooter not found" });

    if (scooter.status !== "Available") {
      return res.status(400).json({ message: "Scooter not available for booking" });
    }
    

    
    const user = await User.findById(req.user.id); 

    if (!user) {
      return res.status(401).json({ message: "User not found or not authorized" });
    }

    scooter.status = "In Use";
    scooter.lastBookedAt = new Date();
    scooter.bookedBy = user._id; 
    await scooter.save();

     // Save the booking history
    const trip = new Trip({
      userId: req.user.id,
      scooterId: scooter._id,
      startLocation: {
        type: 'Point',
        coordinates: scooter.location.coordinates, 
        startLocationName: scooter.location.locationName
      },
      endLocation: {
        type: 'Point',
        coordinates: scooter.location.coordinates, 
      },
      startTime: new Date(),
      status: 'ONGOING',
      fare: {
        amount: 0, 
        currency: 'EGP',
      },
    });

    await trip.save();

    res.json({ message: "Scooter booked successfully", scooter, trip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getScooters, bookScooter };
