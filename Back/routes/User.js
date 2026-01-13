const express = require("express");
const router = express.Router();

const { updateSettings } = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

router.put("/settings", authMiddleware, updateSettings);

module.exports = router;
