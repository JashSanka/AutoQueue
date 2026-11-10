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

/**
 * PATCH /api/cars/:carModelId
 * ADMIN only – partially update a catalogue entry.
 */
const updateCar = async (req, res) => {
    try {
        const idValidation = carModelIdSchema.safeParse(req.params.carModelId);

        if (!idValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid car model ID"
            });
        }

        const bodyValidation = updateCarSchema.safeParse(req.body);

        if (!bodyValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request body",
                errors: bodyValidation.error.issues.map((issue) => ({
                    field: issue.path[0] ?? "_",
                    message: issue.message
                }))
            });
        }

        const { carModelId } = req.params;

        const existing = await prisma.carModel.findUnique({
            where: { carModelId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Car not found"
            });
        }

        const updated = await prisma.carModel.update({
            where: { carModelId },
            data: bodyValidation.data
        });

        return res.status(200).json({
            success: true,
            message: "Car updated successfully",
            car: safeCarFields(updated)
        });
    } catch (error) {
        console.error("Update car error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A car with the same brand and model already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update car"
        });
    }
};

/**
 * DELETE /api/cars/:carModelId
 * ADMIN only – delete a catalogue entry (blocked if referenced by Inventory or Queue).
 */
const deleteCar = async (req, res) => {
    try {
        const validation = carModelIdSchema.safeParse(req.params.carModelId);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid car model ID"
            });
        }

        const { carModelId } = req.params;

        const existing = await prisma.carModel.findUnique({
            where: { carModelId },
            include: {
                _count: {
                    select: {
                        inventory: true,
                        queue: true
                    }
                }
            }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Car not found"
            });
        }

        const { inventory: inventoryCount, queue: queueCount } = existing._count;

        if (inventoryCount > 0 || queueCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this car because it is referenced by existing inventory or queue records",
                references: {
                    inventoryRecords: inventoryCount,
                    queueRecords: queueCount
                }
            });
        }

        await prisma.carModel.delete({ where: { carModelId } });

        return res.status(200).json({
            success: true,
            message: "Car deleted from catalogue"
        });
    } catch (error) {
        console.error("Delete car error:", error);

        if (error.code === "P2003") {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this car because it is still referenced by other records"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to delete car"
        });
    }
};

module.exports = { createCar, getAllCars, getCarById, updateCar, deleteCar };
