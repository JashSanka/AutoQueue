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
    variant: z.string({ required_error: "Variant is required" }).trim().min(1, "Variant must not be empty"),
    color: z.string({ required_error: "Color is required" }).trim().min(1, "Color must not be empty"),
    totalUnits: z.number({ required_error: "totalUnits is required" }).int("totalUnits must be an integer").min(0, "totalUnits cannot be negative"),
    availableUnits: z.number({ required_error: "availableUnits is required" }).int("availableUnits must be an integer").min(0, "availableUnits cannot be negative"),
    exShowroom: z.number({ required_error: "exShowroom is required" }).min(0, "exShowroom cannot be negative"),
    insurance: z.number({ required_error: "insurance is required" }).min(0, "insurance cannot be negative"),
    rto: z.number({ required_error: "rto is required" }).min(0, "rto cannot be negative"),
    accessories: z.number({ required_error: "accessories is required" }).min(0, "accessories cannot be negative"),
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

module.exports = {
    createInventory,
    getMyInventory,
    getInventoryById,
    calculateTotalPrice,
    formatInventory,
    inventoryIdSchema
};
