const express = require("express");
const router = express.Router();

const {
    createInventory,
    getMyInventory,
    getInventoryById
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

// Route ordering: /my must come before /:inventoryId
router.get(
    "/my",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    getMyInventory
);

router.get(
    "/:inventoryId",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    getInventoryById
);

module.exports = router;
