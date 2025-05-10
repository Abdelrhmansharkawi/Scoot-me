const express = require("express");
const { getScooters, bookScooter } = require("../controllers/scooterController.js"); 
const auth = require('../middleware/auth');
const router = express.Router();

router.get("/", auth ,getScooters);
router.patch("/:id/book",auth, bookScooter);

module.exports = router;
