const express = require("express");
const router = express.Router();

const {
    acceptOffer,
} = require("../controllers/booking.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

// ─── Customer Routes ─────────────────────────────────────────────────────────
router.post("/accept/:offerId", authenticate, authorize("CUSTOMER"), acceptOffer);

module.exports = router;
