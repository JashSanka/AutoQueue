const express = require("express");
const router = express.Router();

const {
    createCar,
    getAllCars,
    getCarById
} = require("../controllers/car.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

// Any authenticated user
router.get("/", authenticate, getAllCars);
router.get("/:carModelId", authenticate, getCarById);

// ADMIN only
router.post("/", authenticate, authorize("ADMIN"), createCar);

module.exports = router;
