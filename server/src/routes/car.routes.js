const express = require("express");
const router = express.Router();

const {
    createCar
} = require("../controllers/car.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

// ADMIN only
router.post("/", authenticate, authorize("ADMIN"), createCar);

module.exports = router;
