const express = require("express");
const router = express.Router();

const {
    acceptOffer,
    getMyBookings,
    getDealerBookings,
    getBookingById,
} = require("../controllers/booking.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

// ─── Static Routes (must be before :bookingId) ───────────────────────────────
router.post("/accept/:offerId", authenticate, authorize("CUSTOMER"), acceptOffer);
router.get("/my", authenticate, authorize("CUSTOMER"), getMyBookings);
router.get("/dealer/my", authenticate, authorize("DEALER"), dealerVerified, getDealerBookings);

// ─── Parameterized Routes ────────────────────────────────────────────────────
router.get("/:bookingId", authenticate, authorize("CUSTOMER", "DEALER"), getBookingById);

module.exports = router;
