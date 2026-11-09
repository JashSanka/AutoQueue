const express = require("express");
const router = express.Router();

const { verifyDealer } = require("../controllers/admin.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

router.patch(
    "/dealers/:dealerId/verify",
    authenticate,
    authorize("ADMIN"),
    verifyDealer
);

module.exports = router;