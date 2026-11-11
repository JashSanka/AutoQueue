const express = require("express");
const router = express.Router();

const {
    createInventory
} = require("../controllers/inventory.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

// Verified DEALER only
router.post(
    "/",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    createInventory
);

module.exports = router;
