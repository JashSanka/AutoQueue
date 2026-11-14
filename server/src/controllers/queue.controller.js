const prisma = require("../config/prisma");
const { z } = require("zod");

// ─── Schemas ─────────────────────────────────────────────────────────────────

const queueIdSchema = z.uuid({ message: "Invalid queue ID" });

const joinQueueSchema = z.object({
    carModelId: z.uuid({ message: "Invalid car model ID" }),
    variant: z
        .string({ error: "Variant is required" })
        .trim()
        .min(1, "Variant must not be empty"),
    city: z
        .string({ error: "City is required" })
        .trim()
        .min(1, "City must not be empty"),
    preferredDealerId: z
        .uuid({ message: "Invalid dealer ID" })
        .nullable()
        .optional(),
    colorPreference: z
        .string()
        .trim()
        .min(1)
        .nullable()
        .optional(),
    maxBudget: z
        .number()
        .nonnegative("maxBudget cannot be negative")
        .nullable()
        .optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate FIFO position of a WAITING entry.
 * Position = 1 + count of WAITING entries with an earlier joinedAt,
 * or same joinedAt but lexicographically smaller entryId.
 */
async function calculatePosition(queueId, entryId, joinedAt) {
    const count = await prisma.queueEntry.count({
        where: {
            queueId,
            status: "WAITING",
            OR: [
                { joinedAt: { lt: joinedAt } },
                { joinedAt: joinedAt, entryId: { lt: entryId } },
            ],
        },
    });
    return count + 1;
}

function safeEntryFields(entry) {
    return {
        entryId: entry.entryId,
        queueId: entry.queueId,
        status: entry.status,
        joinedAt: entry.joinedAt,
        updatedAt: entry.updatedAt,
        colorPreference: entry.colorPreference ?? null,
        maxBudget: entry.maxBudget ?? null,
        preferredDealerId: entry.preferredDealerId ?? null,
    };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/queues/join
 * Customer joins (or rejoins) a queue.
 */
const joinQueue = async (req, res) => {
    try {
        const parsed = joinQueueSchema.safeParse(req.body);
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
            carModelId,
            variant,
            city,
            preferredDealerId,
            colorPreference,
            maxBudget,
        } = parsed.data;

        const customerId = req.user.userId;

        // Verify car model exists
        const carModel = await prisma.carModel.findUnique({
            where: { carModelId },
        });
        if (!carModel) {
            return res.status(404).json({
                success: false,
                message: "Car model not found",
            });
        }

        // If preferred dealer supplied — verify it exists, is verified, and is in the city
        if (preferredDealerId) {
            const dealer = await prisma.dealer.findUnique({
                where: { dealerId: preferredDealerId },
            });
            if (!dealer) {
                return res.status(404).json({
                    success: false,
                    message: "Preferred dealer not found",
                });
            }
            if (!dealer.verified) {
                return res.status(400).json({
                    success: false,
                    message: "Preferred dealer is not verified",
                });
            }
            if (dealer.city.toLowerCase() !== city.toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: "Preferred dealer is not in the specified city",
                });
            }
        }

        // Find or create the queue atomically
        let queue;
        try {
            queue = await prisma.queue.upsert({
                where: {
                    carModelId_variant_city: { carModelId, variant, city },
                },
                update: {},
                create: { carModelId, variant, city, status: "OPEN" },
            });
        } catch (err) {
            // Fallback: race condition on upsert — fetch the existing one
            if (err.code === "P2002") {
                queue = await prisma.queue.findUnique({
                    where: {
                        carModelId_variant_city: { carModelId, variant, city },
                    },
                });
            } else {
                throw err;
            }
        }

        if (queue.status === "CLOSED") {
            return res.status(409).json({
                success: false,
                message: "This queue is closed and no longer accepting entries",
            });
        }

        // Check if customer already has an entry in this queue
        const existingEntry = await prisma.queueEntry.findUnique({
            where: {
                queueId_customerId: { queueId: queue.queueId, customerId },
            },
        });

        let entry;

        if (existingEntry) {
            if (existingEntry.status === "WAITING") {
                return res.status(409).json({
                    success: false,
                    message: "You are already in this queue",
                });
            }
            if (existingEntry.status === "OFFERED") {
                return res.status(409).json({
                    success: false,
                    message: "You have a pending offer for this queue",
                });
            }
            if (existingEntry.status === "BOOKED") {
                return res.status(409).json({
                    success: false,
                    message: "This queue entry already has booking history and cannot be reactivated",
                });
            } else if (existingEntry.status === "LEFT") {
                const booking = await prisma.booking.findUnique({
                    where: { queueEntryId: existingEntry.entryId },
                    select: { bookingId: true },
                });
                if (booking) {
                    return res.status(409).json({
                        success: false,
                        message: "This queue entry has booking history and cannot be reactivated",
                    });
                }
                // Invalidate any leftover pending offers from previous cycle
                await prisma.offer.updateMany({
                    where: {
                        queueEntryId: existingEntry.entryId,
                        status: "PENDING",
                    },
                    data: {
                        status: "CANCELLED",
                    },
                });

                // status === "LEFT" — rejoin by reactivating the existing entry
                entry = await prisma.queueEntry.update({
                    where: { entryId: existingEntry.entryId },
                    data: {
                        status: "WAITING",
                        joinedAt: new Date(),
                        preferredDealerId: preferredDealerId ?? null,
                        colorPreference: colorPreference ?? null,
                        maxBudget: maxBudget != null ? maxBudget.toString() : null,
                    },
                });
            }
        } else {
            // New entry
            entry = await prisma.queueEntry.create({
                data: {
                    queueId: queue.queueId,
                    customerId,
                    preferredDealerId: preferredDealerId ?? null,
                    colorPreference: colorPreference ?? null,
                    maxBudget: maxBudget != null ? maxBudget.toString() : null,
                    status: "WAITING",
                },
            });
        }

        const position = await calculatePosition(
            queue.queueId,
            entry.entryId,
            entry.joinedAt
        );

        return res.status(201).json({
            success: true,
            message: existingEntry
                ? "Rejoined queue successfully"
                : "Joined queue successfully",
            entry: {
                ...safeEntryFields(entry),
                position,
            },
            queue: {
                queueId: queue.queueId,
                brand: carModel.brand,
                model: carModel.model,
                variant: queue.variant,
                city: queue.city,
                status: queue.status,
            },
        });
    } catch (err) {
        console.error("joinQueue error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while joining the queue",
        });
    }
};

/**
 * GET /api/queues/my
 * Returns all queue entries for the authenticated customer.
 */
const getMyQueues = async (req, res) => {
    try {
        const customerId = req.user.userId;

        const entries = await prisma.queueEntry.findMany({
            where: { customerId },
            include: {
                queue: {
                    include: {
                        carModel: true,
                    },
                },
            },
            orderBy: { joinedAt: "desc" },
        });

        const result = await Promise.all(
            entries.map(async (entry) => {
                let position = null;
                if (entry.status === "WAITING") {
                    position = await calculatePosition(
                        entry.queueId,
                        entry.entryId,
                        entry.joinedAt
                    );
                }
                return {
                    entryId: entry.entryId,
                    queueId: entry.queueId,
                    brand: entry.queue.carModel.brand,
                    model: entry.queue.carModel.model,
                    variant: entry.queue.variant,
                    city: entry.queue.city,
                    queueStatus: entry.queue.status,
                    status: entry.status,
                    position,
                    joinedAt: entry.joinedAt,
                    updatedAt: entry.updatedAt,
                    colorPreference: entry.colorPreference ?? null,
                    maxBudget: entry.maxBudget ?? null,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Queue entries retrieved successfully",
            entries: result,
        });
    } catch (err) {
        console.error("getMyQueues error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving your queues",
        });
    }
};

/**
 * GET /api/queues/:queueId
 * Returns queue details along with the customer's own entry.
 */
const getQueueDetails = async (req, res) => {
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

        const queue = await prisma.queue.findUnique({
            where: { queueId },
            include: { carModel: true },
        });

        if (!queue) {
            return res.status(404).json({
                success: false,
                message: "Queue not found",
            });
        }

        const entry = await prisma.queueEntry.findUnique({
            where: { queueId_customerId: { queueId, customerId } },
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: "You are not a member of this queue",
            });
        }

        const totalWaiting = await prisma.queueEntry.count({
            where: { queueId, status: "WAITING" },
        });

        let position = null;
        if (entry.status === "WAITING") {
            position = await calculatePosition(queueId, entry.entryId, entry.joinedAt);
        }

        return res.status(200).json({
            success: true,
            message: "Queue details retrieved successfully",
            queue: {
                queueId: queue.queueId,
                brand: queue.carModel.brand,
                model: queue.carModel.model,
                variant: queue.variant,
                city: queue.city,
                status: queue.status,
                totalWaiting,
                createdAt: queue.createdAt,
            },
            entry: {
                entryId: entry.entryId,
                status: entry.status,
                position,
                joinedAt: entry.joinedAt,
                updatedAt: entry.updatedAt,
                colorPreference: entry.colorPreference ?? null,
                maxBudget: entry.maxBudget ?? null,
            },
        });
    } catch (err) {
        console.error("getQueueDetails error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving queue details",
        });
    }
};

/**
 * GET /api/queues/:queueId/position
 * Returns the FIFO position of the customer in the given queue.
 */
const getQueuePosition = async (req, res) => {
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

        const queue = await prisma.queue.findUnique({ where: { queueId } });
        if (!queue) {
            return res.status(404).json({
                success: false,
                message: "Queue not found",
            });
        }

        const entry = await prisma.queueEntry.findUnique({
            where: { queueId_customerId: { queueId, customerId } },
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: "You are not a member of this queue",
            });
        }

        if (entry.status !== "WAITING") {
            return res.status(200).json({
                success: true,
                message: "Position is not applicable for your current entry status",
                queueId,
                entryId: entry.entryId,
                status: entry.status,
                position: null,
            });
        }

        const position = await calculatePosition(queueId, entry.entryId, entry.joinedAt);

        return res.status(200).json({
            success: true,
            message: "Queue position retrieved successfully",
            queueId,
            entryId: entry.entryId,
            status: entry.status,
            position,
            joinedAt: entry.joinedAt,
        });
    } catch (err) {
        console.error("getQueuePosition error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving queue position",
        });
    }
};

/**
 * DELETE /api/queues/:queueId/leave
 * Customer leaves a queue.
 */
const leaveQueue = async (req, res) => {
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

        const entry = await prisma.queueEntry.findUnique({
            where: { queueId_customerId: { queueId, customerId } },
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: "You are not a member of this queue",
            });
        }

        if (entry.status === "LEFT") {
            return res.status(409).json({
                success: false,
                message: "You have already left this queue",
            });
        }

        if (entry.status === "BOOKED") {
            return res.status(409).json({
                success: false,
                message: "Cannot leave — your booking is already confirmed",
            });
        }

        let updatedEntry;

        if (entry.status === "OFFERED") {
            // Cancel any pending offers and mark entry as LEFT in a transaction
            updatedEntry = await prisma.$transaction(async (tx) => {
                await tx.offer.updateMany({
                    where: {
                        queueEntryId: entry.entryId,
                        status: "PENDING",
                    },
                    data: { status: "CANCELLED" },
                });
                return tx.queueEntry.update({
                    where: { entryId: entry.entryId },
                    data: { status: "LEFT" },
                });
            });
        } else {
            // WAITING — simple update
            updatedEntry = await prisma.queueEntry.update({
                where: { entryId: entry.entryId },
                data: { status: "LEFT" },
            });
        }

        return res.status(200).json({
            success: true,
            message: "Left queue successfully",
            entry: {
                entryId: updatedEntry.entryId,
                queueId: updatedEntry.queueId,
                status: updatedEntry.status,
            },
        });
    } catch (err) {
        console.error("leaveQueue error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while leaving the queue",
        });
    }
};

module.exports = {
    joinQueue,
    getMyQueues,
    getQueueDetails,
    getQueuePosition,
    leaveQueue,
};
