const express = require("express");
const router = express.Router();

const { verifyDealer, listDealers } = require("../controllers/admin.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

router.get("/dealers", authenticate, authorize("ADMIN"), listDealers);
router.patch(
    "/dealers/:dealerId/verify",
    authenticate,
    authorize("ADMIN"),
    verifyDealer
);

module.exports = router;
