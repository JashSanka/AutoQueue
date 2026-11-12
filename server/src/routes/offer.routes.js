const express = require("express");
const router = express.Router();

const {
    getEligibleQueueEntries,
    createOffer,
    getMyOffers,
    updateOffer,
    getOffersByQueue,
    getOfferById,
} = require("../controllers/offer.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

// ─── Dealer routes ───────────────────────────────────────────────────────────
// Note: Static routes declared before parameterized routes
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

router.patch(
    "/:offerId",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    updateOffer
);

// ─── Customer routes ─────────────────────────────────────────────────────────
router.get(
    "/queue/:queueId",
    authenticate,
    authorize("CUSTOMER"),
    getOffersByQueue
);

router.get(
    "/:offerId",
    authenticate,
    authorize("CUSTOMER"),
    getOfferById
);

module.exports = router;
