const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");
const { z } = require("zod");

// ─── Schemas ─────────────────────────────────────────────────────────────────

const offerIdSchema = z.uuid({ message: "Invalid offer ID" });
const queueIdSchema = z.uuid({ message: "Invalid queue ID" });

const createOfferSchema = z.object({
    queueEntryId: z.uuid({ message: "Invalid queue entry ID" }),
    inventoryId: z.uuid({ message: "Invalid inventory ID" }),
    insurance: z
        .number({ error: "insurance is required" })
        .nonnegative("insurance cannot be negative")
        ,
    rto: z
        .number({ error: "rto is required" })
        .nonnegative("rto cannot be negative")
        ,
    accessories: z
        .number({ error: "accessories is required" })
        .nonnegative("accessories cannot be negative")
        ,
    discount: z
        .number()
        .nonnegative("discount cannot be negative")
        .default(0),
});

const updateOfferSchema = z
    .object({
        insurance: z
            .number()
            .nonnegative("insurance cannot be negative")
            .optional(),
        rto: z
            .number()
            .nonnegative("rto cannot be negative")
            .optional(),
        accessories: z
            .number()
            .nonnegative("accessories cannot be negative")
            .optional(),
        discount: z
            .number()
            .nonnegative("discount cannot be negative")
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one pricing component must be provided for update",
    });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateTotalPrice({ exShowroom, insurance, rto, accessories, discount }) {
    const ex = new Prisma.Decimal(exShowroom.toString());
    const ins = new Prisma.Decimal(insurance.toString());
    const r = new Prisma.Decimal(rto.toString());
    const acc = new Prisma.Decimal(accessories.toString());
    const disc = new Prisma.Decimal((discount ?? 0).toString());
    return ex.plus(ins).plus(r).plus(acc).minus(disc);
}

/**
 * Lazy offer expiration check.
 * If offer is PENDING and expired, transitions status to EXPIRED.
 * If no other valid pending offers remain for the queue entry, reverts QueueEntry to WAITING.
 */
async function checkAndExpireOffer(offer, tx = prisma) {
    if (offer.status === "PENDING" && new Date(offer.expiresAt) < new Date()) {
        const updated = await tx.offer.update({
            where: { offerId: offer.offerId },
            data: { status: "EXPIRED" },
        });

        const otherPendingCount = await tx.offer.count({
            where: {
                queueEntryId: offer.queueEntryId,
                offerId: { not: offer.offerId },
                status: "PENDING",
                expiresAt: { gt: new Date() },
            },
        });

        if (otherPendingCount === 0) {
            const entry = await tx.queueEntry.findUnique({
                where: { entryId: offer.queueEntryId },
            });
            if (entry && entry.status === "OFFERED") {
                await tx.queueEntry.update({
                    where: { entryId: offer.queueEntryId },
                    data: { status: "WAITING" },
                });
            }
        }

        return { ...offer, status: "EXPIRED" };
    }
    return offer;
}

function formatOffer(offer) {
    return {
        offerId: offer.offerId,
        queueEntryId: offer.queueEntryId,
        inventoryId: offer.inventoryId,
        dealerId: offer.dealerId,
        exShowroom: offer.exShowroom.toString(),
        insurance: offer.insurance.toString(),
        rto: offer.rto.toString(),
        accessories: offer.accessories.toString(),
        discount: offer.discount.toString(),
        totalPrice: offer.totalPrice.toString(),
        status: offer.status,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        ...(offer.dealer && {
            dealer: {
                dealerId: offer.dealer.dealerId,
                dealerName: offer.dealer.dealerName,
                city: offer.dealer.city,
                address: offer.dealer.address,
            },
        }),
        ...(offer.inventory && {
            inventory: {
                inventoryId: offer.inventory.inventoryId,
                variant: offer.inventory.variant,
                color: offer.inventory.color,
            },
        }),
        ...(offer.queueEntry && {
            queueEntry: {
                entryId: offer.queueEntry.entryId,
                queueId: offer.queueEntry.queueId,
                status: offer.queueEntry.status,
                colorPreference: offer.queueEntry.colorPreference,
                maxBudget: offer.queueEntry.maxBudget
                    ? offer.queueEntry.maxBudget.toString()
                    : null,
                joinedAt: offer.queueEntry.joinedAt,
                ...(offer.queueEntry.queue && {
                    queue: {
                        queueId: offer.queueEntry.queue.queueId,
                        variant: offer.queueEntry.queue.variant,
                        city: offer.queueEntry.queue.city,
                        status: offer.queueEntry.queue.status,
                        ...(offer.queueEntry.queue.carModel && {
                            carModel: {
                                carModelId: offer.queueEntry.queue.carModel.carModelId,
                                brand: offer.queueEntry.queue.carModel.brand,
                                model: offer.queueEntry.queue.carModel.model,
                                imageUrl: offer.queueEntry.queue.carModel.imageUrl,
                            },
                        }),
                    },
                }),
            },
        }),
    };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/offers/eligible-entries
 * Returns eligible customer queue entries for which the authenticated verified dealer can submit offers.
 */
const getEligibleQueueEntries = async (req, res) => {
    try {
        const dealer = req.dealer;

        // 1. Fetch active inventory with stock belonging to this dealer
        const inventories = await prisma.inventory.findMany({
            where: {
                dealerId: dealer.dealerId,
                active: true,
                availableUnits: { gt: 0 },
            },
            include: {
                carModel: true,
            },
        });

        if (inventories.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No eligible queue entries found",
                entries: [],
            });
        }

        const carModelIds = [...new Set(inventories.map((i) => i.carModelId))];

        // 2. Find OPEN queues in dealer's city for these car models with WAITING entries
        const queueEntries = await prisma.queueEntry.findMany({
            where: {
                status: "WAITING",
                queue: {
                    status: "OPEN",
                    city: { equals: dealer.city, mode: "insensitive" },
                    carModelId: { in: carModelIds },
                },
                OR: [
                    { preferredDealerId: null },
                    { preferredDealerId: dealer.dealerId },
                ],
                offers: {
                    none: {
                        dealerId: dealer.dealerId,
                    },
                },
            },
            include: {
                queue: {
                    include: {
                        carModel: true,
                    },
                },
            },
            orderBy: { joinedAt: "asc" },
        });

        // 3. Filter entries based on customer preferences and dealer's matching inventory
        const eligible = [];

        for (const entry of queueEntries) {
            const matchingInventories = inventories.filter((inv) => {
                if (inv.carModelId !== entry.queue.carModelId) return false;
                if (inv.variant.toLowerCase() !== entry.queue.variant.toLowerCase()) return false;

                if (
                    entry.colorPreference &&
                    inv.color.toLowerCase() !== entry.colorPreference.toLowerCase()
                ) {
                    return false;
                }

                if (entry.maxBudget != null) {
                    const estTotal = calculateTotalPrice(inv);
                    const budget = new Prisma.Decimal(entry.maxBudget.toString());
                    if (estTotal.greaterThan(budget)) {
                        return false;
                    }
                }

                return true;
            });

            if (matchingInventories.length > 0) {
                eligible.push({
                    entryId: entry.entryId,
                    queueId: entry.queueId,
                    carModel: {
                        carModelId: entry.queue.carModel.carModelId,
                        brand: entry.queue.carModel.brand,
                        model: entry.queue.carModel.model,
                        imageUrl: entry.queue.carModel.imageUrl,
                    },
                    variant: entry.queue.variant,
                    city: entry.queue.city,
                    colorPreference: entry.colorPreference ?? null,
                    maxBudget: entry.maxBudget ? entry.maxBudget.toString() : null,
                    joinedAt: entry.joinedAt,
                    matchingInventories: matchingInventories.map((inv) => ({
                        inventoryId: inv.inventoryId,
                        variant: inv.variant,
                        color: inv.color,
                        availableUnits: inv.availableUnits,
                        exShowroom: inv.exShowroom.toString(),
                        estimatedTotalPrice: calculateTotalPrice(inv).toString(),
                    })),
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Eligible queue entries retrieved successfully",
            entries: eligible,
        });
    } catch (err) {
        console.error("getEligibleQueueEntries error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while fetching eligible queue entries",
        });
    }
};

/**
 * POST /api/offers
 * Dealer creates an offer for an eligible QueueEntry.
 */
const createOffer = async (req, res) => {
    try {
        const parsed = createOfferSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: parsed.error.issues.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                })),
            });
        }

        const {
            queueEntryId,
            inventoryId,
            insurance,
            rto,
            accessories,
            discount,
        } = parsed.data;

        const dealerId = req.dealer.dealerId;

        // Verify Inventory belongs to this dealer
        const inventory = await prisma.inventory.findUnique({
            where: { inventoryId },
            include: { carModel: true },
        });

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found",
            });
        }

        if (inventory.dealerId !== dealerId) {
            return res.status(403).json({
                success: false,
                message: "You can only create offers using your own inventory",
            });
        }

        if (!inventory.active) {
            return res.status(400).json({
                success: false,
                message: "Inventory is not active",
            });
        }

        if (inventory.availableUnits <= 0) {
            return res.status(400).json({
                success: false,
                message: "No available units in inventory",
            });
        }

        // Verify QueueEntry exists
        const entry = await prisma.queueEntry.findUnique({
            where: { entryId: queueEntryId },
            include: { queue: true },
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: "Queue entry not found",
            });
        }

        if (entry.status === "BOOKED" || entry.status === "LEFT") {
            return res.status(409).json({
                success: false,
                message: `Queue entry is no longer accepting offers (current status: ${entry.status})`,
            });
        }

        if (entry.queue.status !== "OPEN") {
            return res.status(409).json({
                success: false,
                message: "Queue is closed and no longer accepting offers",
            });
        }

        // Verify city match
        if (entry.queue.city.toLowerCase() !== req.dealer.city.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "Dealer cannot submit offers outside their registered city",
            });
        }

        // Verify preferred dealer restriction
        if (entry.preferredDealerId && entry.preferredDealerId !== dealerId) {
            return res.status(403).json({
                success: false,
                message: "Customer has specified a preferred dealer and cannot receive offers from other dealers",
            });
        }

        // Verify car model and variant match
        if (
            inventory.carModelId !== entry.queue.carModelId ||
            inventory.variant.toLowerCase() !== entry.queue.variant.toLowerCase()
        ) {
            return res.status(400).json({
                success: false,
                message: "Inventory car model and variant must match the queue",
            });
        }

        // Verify color preference if specified
        if (
            entry.colorPreference &&
            inventory.color.toLowerCase() !== entry.colorPreference.toLowerCase()
        ) {
            return res.status(400).json({
                success: false,
                message: `Inventory color (${inventory.color}) does not match customer's color preference (${entry.colorPreference})`,
            });
        }

        // Check if dealer already submitted an offer for this queue entry
        const existingOffer = await prisma.offer.findUnique({
            where: {
                queueEntryId_dealerId: { queueEntryId, dealerId },
            },
        });

        if (existingOffer) {
            return res.status(409).json({
                success: false,
                message: "You have already submitted an offer for this queue entry",
            });
        }

        // Calculate pricing
        const ex = new Prisma.Decimal(inventory.exShowroom.toString());
        const ins = new Prisma.Decimal(insurance.toString());
        const r = new Prisma.Decimal(rto.toString());
        const acc = new Prisma.Decimal(accessories.toString());
        const disc = new Prisma.Decimal((discount ?? 0).toString());
        const totalPrice = ex.plus(ins).plus(r).plus(acc).minus(disc);

        if (totalPrice.lessThan(0)) {
            return res.status(400).json({
                success: false,
                message: "Calculated total price cannot be negative",
            });
        }

        // Verify customer's maxBudget
        if (entry.maxBudget != null) {
            const maxBudget = new Prisma.Decimal(entry.maxBudget.toString());
            if (totalPrice.greaterThan(maxBudget)) {
                return res.status(400).json({
                    success: false,
                    message: `Offer total price (${totalPrice.toString()}) exceeds customer's maximum budget (${maxBudget.toString()})`,
                });
            }
        }

        // Expiry calculation
        // Set offer expiry to 24 hours from creation
        const expDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Atomically create offer and update QueueEntry to OFFERED in a transaction
        const created = await prisma.$transaction(async (tx) => {
            const newOffer = await tx.offer.create({
                data: {
                    queueEntryId,
                    inventoryId,
                    dealerId,
                    exShowroom: ex,
                    insurance: ins,
                    rto: r,
                    accessories: acc,
                    discount: disc,
                    totalPrice,
                    status: "PENDING",
                    expiresAt: expDate,
                },
                include: {
                    dealer: {
                        select: {
                            dealerId: true,
                            dealerName: true,
                            city: true,
                            address: true,
                        },
                    },
                    inventory: {
                        select: {
                            inventoryId: true,
                            variant: true,
                            color: true,
                        },
                    },
                },
            });

            await tx.queueEntry.update({
                where: { entryId: queueEntryId },
                data: { status: "OFFERED" },
            });

            return newOffer;
        });

        return res.status(201).json({
            success: true,
            message: "Offer created successfully",
            offer: formatOffer(created),
        });
    } catch (err) {
        if (err.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "You have already submitted an offer for this queue entry",
            });
        }
        console.error("createOffer error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while creating the offer",
        });
    }
};

/**
 * GET /api/offers/my
 * Dealer views all offers submitted by their dealership.
 */
const getMyOffers = async (req, res) => {
    try {
        const dealerId = req.dealer.dealerId;

        const offers = await prisma.offer.findMany({
            where: { dealerId },
            include: {
                inventory: {
                    select: {
                        inventoryId: true,
                        variant: true,
                        color: true,
                    },
                },
                queueEntry: {
                    include: {
                        queue: {
                            include: {
                                carModel: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Process lazy expiration for any expired pending offers
        const activeOffers = [];
        for (const offer of offers) {
            const checked = await checkAndExpireOffer(offer);
            activeOffers.push(checked);
        }

        return res.status(200).json({
            success: true,
            message: "Dealer offers retrieved successfully",
            offers: activeOffers.map(formatOffer),
        });
    } catch (err) {
        console.error("getMyOffers error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving offers",
        });
    }
};

/**
 * PATCH /api/offers/:offerId
 * Dealer updates pricing components of an existing PENDING offer.
 */
const updateOffer = async (req, res) => {
    try {
        const idResult = offerIdSchema.safeParse(req.params.offerId);
        if (!idResult.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid offer ID",
            });
        }
        const offerId = idResult.data;

        // Disallow direct modification of forbidden fields
        if (
            req.body.status !== undefined ||
            req.body.totalPrice !== undefined ||
            req.body.dealerId !== undefined ||
            req.body.queueEntryId !== undefined ||
            req.body.inventoryId !== undefined ||
            req.body.exShowroom !== undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Only pricing components (insurance, rto, accessories, discount) can be updated",
            });
        }

        const parsed = updateOfferSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: parsed.error.issues.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                })),
            });
        }

        const offer = await prisma.offer.findUnique({
            where: { offerId },
            include: {
                queueEntry: true,
            },
        });

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: "Offer not found",
            });
        }

        if (offer.dealerId !== req.dealer.dealerId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update this offer",
            });
        }

        // Check expiration first
        const checkedOffer = await checkAndExpireOffer(offer);
        if (checkedOffer.status !== "PENDING") {
            return res.status(409).json({
                success: false,
                message: `Cannot update offer with status ${checkedOffer.status}. Only PENDING offers can be updated`,
            });
        }

        const { insurance, rto, accessories, discount } = parsed.data;

        const ex = new Prisma.Decimal(offer.exShowroom.toString());
        const ins =
            insurance !== undefined
                ? new Prisma.Decimal(insurance.toString())
                : offer.insurance;
        const r =
            rto !== undefined
                ? new Prisma.Decimal(rto.toString())
                : offer.rto;
        const acc =
            accessories !== undefined
                ? new Prisma.Decimal(accessories.toString())
                : offer.accessories;
        const disc =
            discount !== undefined
                ? new Prisma.Decimal(discount.toString())
                : offer.discount;

        const newTotalPrice = ex.plus(ins).plus(r).plus(acc).minus(disc);

        if (newTotalPrice.lessThan(0)) {
            return res.status(400).json({
                success: false,
                message: "Updated total price cannot be negative",
            });
        }

        // Verify customer's maxBudget
        if (offer.queueEntry.maxBudget != null) {
            const maxBudget = new Prisma.Decimal(offer.queueEntry.maxBudget.toString());
            if (newTotalPrice.greaterThan(maxBudget)) {
                return res.status(400).json({
                    success: false,
                    message: `Updated total price (${newTotalPrice.toString()}) exceeds customer's maximum budget (${maxBudget.toString()})`,
                });
            }
        }

        const updateResult = await prisma.offer.updateMany({
            where: {
                offerId,
                status: "PENDING",
                expiresAt: { gt: new Date() },
            },
            data: {
                ...(insurance !== undefined && { insurance: ins }),
                ...(rto !== undefined && { rto: r }),
                ...(accessories !== undefined && { accessories: acc }),
                ...(discount !== undefined && { discount: disc }),
                totalPrice: newTotalPrice,
            },
        });

        if (updateResult.count === 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot update offer: it is no longer PENDING or has expired",
            });
        }

        const updated = await prisma.offer.findUnique({
            where: { offerId },
            include: {
                inventory: {
                    select: {
                        inventoryId: true,
                        variant: true,
                        color: true,
                    },
                },
                dealer: {
                    select: {
                        dealerId: true,
                        dealerName: true,
                        city: true,
                        address: true,
                    },
                },
                queueEntry: {
                    include: {
                        queue: {
                            include: {
                                carModel: true,
                            },
                        },
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Offer updated successfully",
            offer: formatOffer(updated),
        });
    } catch (err) {
        console.error("updateOffer error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while updating the offer",
        });
    }
};

/**
 * GET /api/offers/queue/:queueId
 * Customer views offers for their entry in the given queue.
 */
const getOffersByQueue = async (req, res) => {
    try {
        const idResult = queueIdSchema.safeParse(req.params.queueId);
        if (!idResult.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid queue ID",
            });
        }
        const queueId = idResult.data;
        const customerId = req.user.userId;

        // Verify customer has entry in this queue
        const entry = await prisma.queueEntry.findUnique({
            where: {
                queueId_customerId: { queueId, customerId },
            },
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: "You do not have an entry in this queue",
            });
        }

        const offers = await prisma.offer.findMany({
            where: { queueEntryId: entry.entryId },
            include: {
                dealer: {
                    select: {
                        dealerId: true,
                        dealerName: true,
                        city: true,
                        address: true,
                    },
                },
                inventory: {
                    select: {
                        inventoryId: true,
                        variant: true,
                        color: true,
                    },
                },
                queueEntry: {
                    include: {
                        queue: {
                            include: {
                                carModel: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const checkedOffers = [];
        for (const offer of offers) {
            const checked = await checkAndExpireOffer(offer);
            checkedOffers.push(checked);
        }

        return res.status(200).json({
            success: true,
            message: "Offers retrieved successfully",
            offers: checkedOffers.map(formatOffer),
        });
    } catch (err) {
        console.error("getOffersByQueue error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving offers",
        });
    }
};

/**
 * GET /api/offers/:offerId
 * Customer views an individual offer.
 */
const getOfferById = async (req, res) => {
    try {
        const idResult = offerIdSchema.safeParse(req.params.offerId);
        if (!idResult.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid offer ID",
            });
        }
        const offerId = idResult.data;
        const customerId = req.user.userId;

        const offer = await prisma.offer.findUnique({
            where: { offerId },
            include: {
                queueEntry: {
                    include: {
                        queue: {
                            include: {
                                carModel: true,
                            },
                        },
                    },
                },
                dealer: {
                    select: {
                        dealerId: true,
                        dealerName: true,
                        city: true,
                        address: true,
                    },
                },
                inventory: {
                    select: {
                        inventoryId: true,
                        variant: true,
                        color: true,
                    },
                },
            },
        });

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: "Offer not found",
            });
        }

        // Ownership check
        if (offer.queueEntry.customerId !== customerId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to view this offer",
            });
        }

        const checkedOffer = await checkAndExpireOffer(offer);

        return res.status(200).json({
            success: true,
            message: "Offer details retrieved successfully",
            offer: formatOffer(checkedOffer),
        });
    } catch (err) {
        console.error("getOfferById error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving the offer",
        });
    }
};

/**
 * PATCH /api/offers/:offerId/reject
 * Customer rejects a PENDING offer.
 */
const rejectOffer = async (req, res) => {
    try {
        const idResult = offerIdSchema.safeParse(req.params.offerId);
        if (!idResult.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid offer ID",
            });
        }
        const offerId = idResult.data;
        const customerId = req.user.userId;

        const offer = await prisma.offer.findUnique({
            where: { offerId },
            include: {
                queueEntry: true,
            },
        });

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: "Offer not found",
            });
        }

        // 1. Verify ownership through associated QueueEntry
        if (offer.queueEntry.customerId !== customerId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to reject this offer",
            });
        }

        // 3. If already expired or expired pending
        if (offer.status === "EXPIRED") {
            return res.status(409).json({
                success: false,
                message: "Cannot reject an expired offer",
            });
        }

        if (offer.status === "PENDING" && new Date(offer.expiresAt) < new Date()) {
            await checkAndExpireOffer(offer);
            return res.status(409).json({
                success: false,
                message: "Offer has expired and cannot be rejected",
            });
        }

        // 2. Only a PENDING offer can be rejected
        if (offer.status !== "PENDING") {
            return res.status(409).json({
                success: false,
                message: `Only PENDING offers can be rejected. Current status is ${offer.status}`,
            });
        }

        // 4. Update status to REJECTED inside transaction and update QueueEntry status
        const result = await prisma.$transaction(async (tx) => {
            const rejected = await tx.offer.update({
                where: { offerId },
                data: { status: "REJECTED" },
            });

            // Check if any other valid PENDING offers exist for this queue entry
            const otherPendingCount = await tx.offer.count({
                where: {
                    queueEntryId: offer.queueEntryId,
                    offerId: { not: offerId },
                    status: "PENDING",
                    expiresAt: { gt: new Date() },
                },
            });

            let finalEntryStatus = offer.queueEntry.status;

            if (otherPendingCount === 0) {
                // If QueueEntry is already BOOKED or LEFT, do not reactivate it
                if (offer.queueEntry.status === "OFFERED") {
                    const updatedEntry = await tx.queueEntry.update({
                        where: { entryId: offer.queueEntryId },
                        data: { status: "WAITING" },
                    });
                    finalEntryStatus = updatedEntry.status;
                }
            }

            return {
                offer: rejected,
                queueEntryStatus: finalEntryStatus,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Offer rejected successfully",
            offer: {
                offerId: result.offer.offerId,
                status: result.offer.status,
            },
            queueEntry: {
                entryId: offer.queueEntryId,
                status: result.queueEntryStatus,
            },
        });
    } catch (err) {
        console.error("rejectOffer error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while rejecting the offer",
        });
    }
};

module.exports = {
    getEligibleQueueEntries,
    createOffer,
    getMyOffers,
    updateOffer,
    getOffersByQueue,
    getOfferById,
    rejectOffer,
    checkAndExpireOffer,
    formatOffer,
    offerIdSchema,
    queueIdSchema,
};
