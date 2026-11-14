const prisma = require("../config/prisma");
const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasExpectedImageSignature(type, bytes) {
    if (type === "png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (type === "jpeg") return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const carModelIdSchema = z.uuid({
    message: "Invalid car model ID"
});

const imageUrlSchema = z
    .string()
    .trim()
    .refine(
        (val) => {
            if (!val) return true;
            if (val.startsWith("/uploads/") || val.startsWith("/images/")) return true;
            try {
                const u = new URL(val);
                return u.protocol === "http:" || u.protocol === "https:";
            } catch {
                return false;
            }
        },
        { message: "imageUrl must be a valid URL or /uploads/ path" }
    )
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional();

const imageUploadSchema = z.object({
    imageDataUrl: z.string().min(1, "An image file is required"),
});

const createCarSchema = z.object({
    brand: z.string().trim().min(1, "Brand is required"),
    model: z.string().trim().min(1, "Model is required"),
    imageUrl: imageUrlSchema
});

const updateCarSchema = z
    .object({
        brand: z.string().trim().min(1, "Brand must not be empty").optional(),
        model: z.string().trim().min(1, "Model must not be empty").optional(),
        imageUrl: imageUrlSchema
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

        const carModelId=validation.data;

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

        const carModelId = idValidation.data;

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

        const carModelId = validation.data;

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

/**
 * POST or PATCH /api/cars/:carModelId/image
 * ADMIN only – upload an image file (PNG, JPEG, WebP up to 4MB) for a car catalogue entry.
 */
const uploadCarImage = async (req, res) => {
    try {
        const idResult = carModelIdSchema.safeParse(req.params.carModelId);
        const bodyResult = imageUploadSchema.safeParse(req.body);

        if (!idResult.success || !bodyResult.success) {
            return res.status(400).json({
                success: false,
                message: "A valid car model ID and imageDataUrl are required"
            });
        }

        const carModelId = idResult.data;
        const existing = await prisma.carModel.findUnique({
            where: { carModelId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Car not found"
            });
        }

        const match = bodyResult.data.imageDataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) {
            return res.status(400).json({
                success: false,
                message: "Upload a valid PNG, JPEG, or WebP image"
            });
        }

        const bytes = Buffer.from(match[2], "base64");
        if (bytes.length === 0 || bytes.length > 4 * 1024 * 1024) {
            return res.status(413).json({
                success: false,
                message: "Image must be between 1 byte and 4 MB"
            });
        }

        if (!hasExpectedImageSignature(match[1], bytes)) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file does not match its image type signature"
            });
        }

        const extension = match[1] === "jpeg" ? "jpg" : match[1];
        const uploadsDir = path.join(__dirname, "../../uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const filename = `${carModelId}-${randomUUID()}.${extension}`;
        await fs.writeFile(path.join(uploadsDir, filename), bytes);
        const imageUrl = `/uploads/${filename}`;

        const updated = await prisma.carModel.update({
            where: { carModelId },
            data: { imageUrl }
        });

        return res.status(200).json({
            success: true,
            message: "Vehicle catalogue image updated successfully",
            car: safeCarFields(updated)
        });
    } catch (error) {
        console.error("Upload car image error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to save vehicle catalogue image"
        });
    }
};

module.exports = { createCar, getAllCars, getCarById, updateCar, deleteCar, uploadCarImage };
