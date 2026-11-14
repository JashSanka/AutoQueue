const express = require("express");
const router = express.Router();

const {
    createCar,
    getAllCars,
    getCarById,
    updateCar,
    deleteCar,
    uploadCarImage
} = require("../controllers/car.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

// Any authenticated user
router.get("/", authenticate, getAllCars);
router.get("/:carModelId", authenticate, getCarById);

// ADMIN only
router.post("/", authenticate, authorize("ADMIN"), createCar);
router.patch("/:carModelId", authenticate, authorize("ADMIN"), updateCar);
router.post("/:carModelId/image", authenticate, authorize("ADMIN"), uploadCarImage);
router.patch("/:carModelId/image", authenticate, authorize("ADMIN"), uploadCarImage);
router.delete("/:carModelId", authenticate, authorize("ADMIN"), deleteCar);

module.exports = router;
