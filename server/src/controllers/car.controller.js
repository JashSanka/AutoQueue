const prisma = require("../config/prisma");
const { z } = require("zod");

// ─── Schemas ────────────────────────────────────────────────────────────────

const carModelIdSchema = z.string().uuid("Invalid car model ID");

const createCarSchema = z.object({
    brand: z.string().trim().min(1, "Brand is required"),
    model: z.string().trim().min(1, "Model is required"),
    imageUrl: z.url("imageUrl must be a valid URL").optional()
});

const updateCarSchema = z
    .object({
        brand: z.string().trim().min(1, "Brand must not be empty").optional(),
        model: z.string().trim().min(1, "Model must not be empty").optional(),
        imageUrl: z
            .url("imageUrl must be a valid URL")
            .nullable()
            .optional()
    })
    .refine(
        (data) => Object.keys(data).length > 0,
        "Request body must include at least one field to update"
    );

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeCarFields(car) {
    return {
        carModelId: car.carModelId,
        brand: car.brand,
        model: car.model,
        imageUrl: car.imageUrl ?? null,
        createdAt: car.createdAt
    };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/cars
 * ADMIN only – create a new car catalogue entry.
 */
const createCar = async (req, res) => {
    try {
        const validation = createCarSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request body",
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path[0],
                    message: issue.message
                }))
            });
        }

        const { brand, model, imageUrl } = validation.data;

        const car = await prisma.carModel.create({
            data: { brand, model, imageUrl: imageUrl ?? null }
        });

        return res.status(201).json({
            success: true,
            message: "Car added to catalogue",
            car: safeCarFields(car)
        });
    } catch (error) {
        console.error("Create car error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: `A car with brand "${req.body?.brand}" and model "${req.body?.model}" already exists`
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create car"
        });
    }
};

/**
 * GET /api/cars
 * Any authenticated user – list all catalogue entries.
 */
const getAllCars = async (req, res) => {
    try {
        const cars = await prisma.carModel.findMany({
            orderBy: [{ brand: "asc" }, { model: "asc" }],
            select: {
                carModelId: true,
                brand: true,
                model: true,
                imageUrl: true,
                createdAt: true
            }
        });

        return res.status(200).json({
            success: true,
            count: cars.length,
            cars
        });
    } catch (error) {
        console.error("Get all cars error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch cars"
        });
    }
};

/**
 * GET /api/cars/:carModelId
 * Any authenticated user – get a single catalogue entry.
 */
const getCarById = async (req, res) => {
    try {
        const validation = carModelIdSchema.safeParse(req.params.carModelId);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid car model ID"
            });
        }

        const { carModelId } = req.params;

        const car = await prisma.carModel.findUnique({
            where: { carModelId },
            select: {
                carModelId: true,
                brand: true,
                model: true,
                imageUrl: true,
                createdAt: true
            }
        });

        if (!car) {
            return res.status(404).json({
                success: false,
                message: "Car not found"
            });
        }

        return res.status(200).json({
            success: true,
            car
        });
    } catch (error) {
        console.error("Get car by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch car"
        });
    }
};

module.exports = { createCar, getAllCars, getCarById };
