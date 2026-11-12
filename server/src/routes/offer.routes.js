const express = require("express");
const router = express.Router();

const {
    getEligibleQueueEntries,
    createOffer,
    getMyOffers,
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

router.get(
    "/my",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    getMyOffers
);

router.post(
    "/",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    createOffer
);

module.exports = router;
