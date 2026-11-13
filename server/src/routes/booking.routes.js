const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

// Routes will be registered here with strict order:
// Static routes before parameterized routes

module.exports = router;
