const express = require("express");
const router = express.Router();

const {
    getEligibleQueueEntries,
} = require("../controllers/offer.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

// ─── Dealer routes ───────────────────────────────────────────────────────────
router.get(
    "/eligible-entries",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    getEligibleQueueEntries
);

module.exports = router;
