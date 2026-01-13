const express = require("express");
const { getScooters, bookScooter, verifyScooter } = require("../controllers/scooterController.js"); 
const auth = require('../middleware/auth');
const router = express.Router();

router.get("/", auth ,getScooters);
router.patch("/:id/book",auth, bookScooter);
router.get('/:id/verify', auth, verifyScooter);

module.exports = router;
