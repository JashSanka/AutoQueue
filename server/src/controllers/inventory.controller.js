const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");
const { z } = require("zod");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateTotalPrice({ exShowroom, insurance, rto, accessories, discount }) {
    const ex = new Prisma.Decimal(exShowroom.toString());
    const ins = new Prisma.Decimal(insurance.toString());
    const r = new Prisma.Decimal(rto.toString());
    const acc = new Prisma.Decimal(accessories.toString());
    const disc = new Prisma.Decimal((discount ?? 0).toString());
    return ex.plus(ins).plus(r).plus(acc).minus(disc);
}

function formatInventory(item) {
    const estimatedTotalPrice = calculateTotalPrice(item);
    return {
        inventoryId: item.inventoryId,
        dealerId: item.dealerId,
        carModelId: item.carModelId,
        variant: item.variant,
        color: item.color,
        totalUnits: item.totalUnits,
        availableUnits: item.availableUnits,
        exShowroom: item.exShowroom,
        insurance: item.insurance,
        rto: item.rto,
        accessories: item.accessories,
        discount: item.discount,
        estimatedTotalPrice: estimatedTotalPrice.toString(),
        active: item.active,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        ...(item.carModel && { carModel: item.carModel }),
        ...(item.dealer && { dealer: item.dealer })
    };
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const inventoryIdSchema = z.uuid({
    message: "Invalid inventory ID"
});

const createInventorySchema = z.object({
    carModelId: z.uuid({ message: "Invalid car model ID" }),
    variant: z.string({ error: "Variant is required" }).trim().min(1, "Variant must not be empty"),
    color: z.string({ error: "Color is required" }).trim().min(1, "Color must not be empty"),
    totalUnits: z.number({ error: "totalUnits is required" }).int("totalUnits must be an integer").min(0, "totalUnits cannot be negative"),
    availableUnits: z.number({ error: "availableUnits is required" }).int("availableUnits must be an integer").min(0, "availableUnits cannot be negative"),
    exShowroom: z.number({ error: "exShowroom is required" }).min(0, "exShowroom cannot be negative"),
    insurance: z.number({ error: "insurance is required" }).min(0, "insurance cannot be negative"),
    rto: z.number({ error: "rto is required" }).min(0, "rto cannot be negative"),
    accessories: z.number({ error: "accessories is required" }).min(0, "accessories cannot be negative"),
    discount: z.number().min(0, "discount cannot be negative").default(0)
}).superRefine((data, ctx) => {
    if (data.availableUnits > data.totalUnits) {
        ctx.addIssue({
            code: "custom",
            path: ["availableUnits"],
            message: "availableUnits cannot exceed totalUnits"
        });
    }

    const priceSum = new Prisma.Decimal(data.exShowroom.toString())
        .plus(new Prisma.Decimal(data.insurance.toString()))
        .plus(new Prisma.Decimal(data.rto.toString()))
        .plus(new Prisma.Decimal(data.accessories.toString()));
    const discountDecimal = new Prisma.Decimal((data.discount ?? 0).toString());

    if (discountDecimal.gt(priceSum)) {
        ctx.addIssue({
            code: "custom",
            path: ["discount"],
            message: "Discount cannot exceed the sum of price components"
        });
    }
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/inventory
 * Verified DEALER only – add an inventory item for a car model.
 */
const createInventory = async (req, res) => {
    try {
        const validation = createInventorySchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid inventory details",
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            });
        }

        const dealerId = req.dealer.dealerId;
        const {
            carModelId,
            variant,
            color,
            totalUnits,
            availableUnits,
            exShowroom,
            insurance,
            rto,
            accessories,
            discount
        } = validation.data;

        // Verify referenced car model exists
        const carModel = await prisma.carModel.findUnique({
            where: { carModelId }
        });

        if (!carModel) {
            return res.status(404).json({
                success: false,
                message: "Car model not found"
            });
        }

        // Check for duplicate inventory (dealerId, carModelId, variant, color)
        const existingInventory = await prisma.inventory.findFirst({
            where: {
                dealerId,
                carModelId,
                variant: { equals: variant.trim(), mode: "insensitive" },
                color: { equals: color.trim(), mode: "insensitive" }
            }
        });

        if (existingInventory) {
            return res.status(409).json({
                success: false,
                message: "An inventory record for this car model, variant, and color already exists in your dealership"
            });
        }

        const newInventory = await prisma.inventory.create({
            data: {
                dealerId,
                carModelId,
                variant: variant.trim(),
                color: color.trim(),
                totalUnits,
                availableUnits,
                exShowroom,
                insurance,
                rto,
                accessories,
                discount: discount ?? 0
            },
            include: {
                carModel: {
                    select: {
                        carModelId: true,
                        brand: true,
                        model: true,
                        imageUrl: true
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Inventory created successfully",
            inventory: formatInventory(newInventory)
        });
    } catch (error) {
        console.error("Create inventory error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "An inventory record for this car model, variant, and color already exists in your dealership"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create inventory"
        });
    }
};

/**
 * GET /api/inventory/my
 * Verified DEALER only – list all inventory items belonging to the authenticated dealer.
 */
const getMyInventory = async (req, res) => {
    try {
        const dealerId = req.dealer.dealerId;

        const items = await prisma.inventory.findMany({
            where: { dealerId },
            include: {
                carModel: {
                    select: {
                        carModelId: true,
                        brand: true,
                        model: true,
                        imageUrl: true
                    }
                }
            },
            orderBy: [{ createdAt: "desc" }]
        });

        const formatted = items.map(formatInventory);

        return res.status(200).json({
            success: true,
            count: formatted.length,
            inventory: formatted
        });
    } catch (error) {
        console.error("Get my inventory error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch inventory"
        });
    }
};

/**
 * GET /api/inventory/:inventoryId
 * Verified DEALER only – fetch inventory details by ID (scoped to authenticated dealer).
 */
const getInventoryById = async (req, res) => {
    try {
        const validation = inventoryIdSchema.safeParse(req.params.inventoryId);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid inventory ID"
            });
        }

        const inventoryId = validation.data;
        const dealerId = req.dealer.dealerId;

        const item = await prisma.inventory.findFirst({
            where: {
                inventoryId,
                dealerId
            },
            include: {
                carModel: {
                    select: {
                        carModelId: true,
                        brand: true,
                        model: true,
                        imageUrl: true
                    }
                }
            }
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Inventory record not found"
            });
        }

        return res.status(200).json({
            success: true,
            inventory: formatInventory(item)
        });
    } catch (error) {
        console.error("Get inventory by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch inventory details"
        });
    }
};

const updateInventorySchema = z.object({
    variant: z.string().trim().min(1, "Variant must not be empty").optional(),
    color: z.string().trim().min(1, "Color must not be empty").optional(),
    totalUnits: z.number().int("totalUnits must be an integer").min(0, "totalUnits cannot be negative").optional(),
    availableUnits: z.number().int("availableUnits must be an integer").min(0, "availableUnits cannot be negative").optional(),
    exShowroom: z.number().min(0, "exShowroom cannot be negative").optional(),
    insurance: z.number().min(0, "insurance cannot be negative").optional(),
    rto: z.number().min(0, "rto cannot be negative").optional(),
    accessories: z.number().min(0, "accessories cannot be negative").optional(),
    discount: z.number().min(0, "discount cannot be negative").optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    "Request body must include at least one field to update"
);

/**
 * PATCH /api/inventory/:inventoryId
 * Verified DEALER only – partially update inventory, enforcing stock integrity and pricing rules.
 */
const updateInventory = async (req, res) => {
    try {
        const idValidation = inventoryIdSchema.safeParse(req.params.inventoryId);
        if (!idValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid inventory ID"
            });
        }

        const inventoryId = idValidation.data;
        const dealerId = req.dealer.dealerId;

        // Disallow changing immutable identifiers
        if (req.body.dealerId !== undefined || req.body.inventoryId !== undefined || req.body.carModelId !== undefined) {
            return res.status(400).json({
                success: false,
                message: "dealerId, inventoryId, and carModelId cannot be modified"
            });
        }

        const bodyValidation = updateInventorySchema.safeParse(req.body);
        if (!bodyValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid update details",
                errors: bodyValidation.error.issues.map((issue) => ({
                    field: issue.path.join(".") || "_",
                    message: issue.message
                }))
            });
        }

        // Verify ownership and load existing record
        const existing = await prisma.inventory.findFirst({
            where: {
                inventoryId,
                dealerId
            }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Inventory record not found"
            });
        }

        const updates = bodyValidation.data;

        // Combine existing with updates to form final state
        const finalVariant = updates.variant !== undefined ? updates.variant.trim() : existing.variant;
        const finalColor = updates.color !== undefined ? updates.color.trim() : existing.color;
        const finalTotalUnits = updates.totalUnits !== undefined ? updates.totalUnits : existing.totalUnits;
        const finalAvailableUnits = updates.availableUnits !== undefined ? updates.availableUnits : existing.availableUnits;
        const finalExShowroom = updates.exShowroom !== undefined ? updates.exShowroom : existing.exShowroom;
        const finalInsurance = updates.insurance !== undefined ? updates.insurance : existing.insurance;
        const finalRto = updates.rto !== undefined ? updates.rto : existing.rto;
        const finalAccessories = updates.accessories !== undefined ? updates.accessories : existing.accessories;
        const finalDiscount = updates.discount !== undefined ? updates.discount : existing.discount;

        // Stock Integrity Rules:
        // 1. Basic stock constraint: availableUnits cannot exceed totalUnits
        if (finalAvailableUnits > finalTotalUnits) {
            return res.status(400).json({
                success: false,
                message: "availableUnits cannot exceed totalUnits"
            });
        }

        // 2. Protect committed (reserved) stock
        const committedUnits = existing.totalUnits - existing.availableUnits;

        if (finalTotalUnits < committedUnits) {
            return res.status(409).json({
                success: false,
                message: `Cannot reduce total units below committed units (currently committed: ${committedUnits})`
            });
        }

        if (finalTotalUnits - finalAvailableUnits < committedUnits) {
            return res.status(409).json({
                success: false,
                message: `Available units cannot exceed totalUnits minus committed units (currently committed: ${committedUnits})`
            });
        }

        // Pricing Rules: discount cannot exceed sum of price components
        const priceSum = new Prisma.Decimal(finalExShowroom.toString())
            .plus(new Prisma.Decimal(finalInsurance.toString()))
            .plus(new Prisma.Decimal(finalRto.toString()))
            .plus(new Prisma.Decimal(finalAccessories.toString()));
        const discountDecimal = new Prisma.Decimal(finalDiscount.toString());

        if (discountDecimal.gt(priceSum)) {
            return res.status(400).json({
                success: false,
                message: "Discount cannot exceed the sum of price components"
            });
        }

        // Uniqueness check if variant or color changed
        if (updates.variant !== undefined || updates.color !== undefined) {
            const duplicate = await prisma.inventory.findFirst({
                where: {
                    dealerId,
                    carModelId: existing.carModelId,
                    variant: { equals: finalVariant, mode: "insensitive" },
                    color: { equals: finalColor, mode: "insensitive" },
                    NOT: { inventoryId: existing.inventoryId }
                }
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "An inventory record with this variant and color already exists for this car model"
                });
            }
        }

        // Atomic update with optimistic concurrency check
        // Atomic update with optimistic concurrency check
        const updated = await prisma.$transaction(async (tx) => {

            const result = await tx.inventory.updateMany({
                where: {
                    inventoryId,
                    dealerId,
                    updatedAt: existing.updatedAt
                },
                data: {
                    ...(updates.variant !== undefined && { variant: finalVariant }),
                    ...(updates.color !== undefined && { color: finalColor }),
                    ...(updates.totalUnits !== undefined && { totalUnits: finalTotalUnits }),
                    ...(updates.availableUnits !== undefined && { availableUnits: finalAvailableUnits }),
                    ...(updates.exShowroom !== undefined && { exShowroom: finalExShowroom }),
                    ...(updates.insurance !== undefined && { insurance: finalInsurance }),
                    ...(updates.rto !== undefined && { rto: finalRto }),
                    ...(updates.accessories !== undefined && { accessories: finalAccessories }),
                    ...(updates.discount !== undefined && { discount: finalDiscount })
                }
            });

            if (result.count === 0) {
                const err = new Error("CONCURRENT_UPDATE");
                err.statusCode = 409;
                throw err;
            }

            return await tx.inventory.findUnique({
                where: { inventoryId },
                include: {
                    carModel: {
                        select: {
                            carModelId: true,
                            brand: true,
                            model: true,
                            imageUrl: true
                        }
                    }
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Inventory updated successfully",
            inventory: formatInventory(updated)
        });
    } catch (error) {
        console.error("Update inventory error:", error);

        if (error.statusCode === 404 || error.message === "NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Inventory record not found"
            });
        }

        if (error.statusCode === 409 || error.message === "CONCURRENT_UPDATE") {
            return res.status(409).json({
                success: false,
                message: "Inventory was modified by another request. Please reload and try again."
            });
        }

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "An inventory record with this variant and color already exists for this car model"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update inventory"
        });
    }
};

const updateStatusSchema = z.object({
    active: z.boolean({
        error: "active must be a boolean"
    })
});

/**
 * PATCH /api/inventory/:inventoryId/status
 * Verified DEALER only – activate or deactivate inventory record.
 */
const updateInventoryStatus = async (req, res) => {
    try {
        const idValidation = inventoryIdSchema.safeParse(req.params.inventoryId);
        if (!idValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid inventory ID"
            });
        }

        const inventoryId = idValidation.data;
        const dealerId = req.dealer.dealerId;

        const bodyValidation = updateStatusSchema.safeParse(req.body);
        if (!bodyValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid status update details",
                errors: bodyValidation.error.issues.map((issue) => ({
                    field: issue.path.join(".") || "active",
                    message: issue.message
                }))
            });
        }

        const { active } = bodyValidation.data;

        const existing = await prisma.inventory.findFirst({
            where: {
                inventoryId,
                dealerId
            }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Inventory record not found"
            });
        }

        const updated = await prisma.inventory.update({
            where: { inventoryId },
            data: { active },
            include: {
                carModel: {
                    select: {
                        carModelId: true,
                        brand: true,
                        model: true,
                        imageUrl: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: `Inventory ${active ? "activated" : "deactivated"} successfully`,
            inventory: formatInventory(updated)
        });
    } catch (error) {
        console.error("Update inventory status error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update inventory status"
        });
    }
};

const browseInventoryQuerySchema = z.object({
    carModelId: z.uuid({ message: "Invalid carModelId query parameter" }).optional(),
    city: z.string().trim().min(1, "city must not be empty").optional(),
    variant: z.string().trim().min(1, "variant must not be empty").optional(),
    color: z.string().trim().min(1, "color must not be empty").optional()
});

/**
 * GET /api/inventory
 * Any authenticated user – browse active inventory with available stock from verified dealers.
 */
const browseInventory = async (req, res) => {
    try {
        const queryValidation = browseInventoryQuerySchema.safeParse(req.query);

        if (!queryValidation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: queryValidation.error.issues.map((issue) => ({
                    field: issue.path.join(".") || "_",
                    message: issue.message
                }))
            });
        }

        const { carModelId, city, variant, color } = queryValidation.data;

        const items = await prisma.inventory.findMany({
            where: {
                active: true,
                availableUnits: { gt: 0 },
                dealer: {
                    verified: true,
                    ...(city && { city: { contains: city, mode: "insensitive" } })
                },
                ...(carModelId && { carModelId }),
                ...(variant && { variant: { contains: variant, mode: "insensitive" } }),
                ...(color && { color: { contains: color, mode: "insensitive" } })
            },
            include: {
                carModel: {
                    select: {
                        carModelId: true,
                        brand: true,
                        model: true,
                        imageUrl: true
                    }
                },
                dealer: {
                    select: {
                        dealerId: true,
                        dealerName: true,
                        city: true,
                        address: true
                    }
                }
            },
            orderBy: [
                { carModel: { brand: "asc" } },
                { carModel: { model: "asc" } },
                { createdAt: "desc" }
            ]
        });

        const formatted = items.map(formatInventory);

        return res.status(200).json({
            success: true,
            count: formatted.length,
            inventory: formatted
        });
    } catch (error) {
        console.error("Browse inventory error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to browse inventory"
        });
    }
};

module.exports = {
    createInventory,
    getMyInventory,
    getInventoryById,
    updateInventory,
    updateInventoryStatus,
    browseInventory,
    calculateTotalPrice,
    formatInventory,
    inventoryIdSchema
};
