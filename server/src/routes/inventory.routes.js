const express = require("express");
const router = express.Router();

const {
    createInventory,
    getMyInventory,
    getInventoryById,
    updateInventory,
    updateInventoryStatus,
    browseInventory
} = require("../controllers/inventory.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

// Any authenticated user (CUSTOMER, DEALER, ADMIN)
router.get(
    "/",
    authenticate,
    browseInventory
);

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

router.patch(
    "/:inventoryId/status",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    updateInventoryStatus
);

router.patch(
    "/:inventoryId",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    updateInventory
);

module.exports = router;
