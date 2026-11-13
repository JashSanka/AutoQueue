const prisma = require("../config/prisma");
const { z } = require("zod");

// ─── Schemas ─────────────────────────────────────────────────────────────────

const offerIdSchema = z.uuid({ message: "Invalid offer ID" });
const bookingIdSchema = z.uuid({ message: "Invalid booking ID" });

// ─── Selects & Helpers ───────────────────────────────────────────────────────

const bookingInclude = {
    customer: {
        select: {
            userId: true,
            name: true,
            email: true,
            phone: true,
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
            carModel: {
                select: {
                    carModelId: true,
                    brand: true,
                    model: true,
                    imageUrl: true,
                },
            },
        },
    },
    offer: {
        select: {
            offerId: true,
            exShowroom: true,
            insurance: true,
            rto: true,
            accessories: true,
            discount: true,
            totalPrice: true,
            status: true,
        },
    },
    queueEntry: {
        select: {
            entryId: true,
            queueId: true,
            status: true,
            joinedAt: true,
        },
    },
};

/**
 * Lazy offer expiration check within transaction or standalone.
 * If offer is PENDING and expired, transitions status to EXPIRED.
 * If no other valid pending offers remain for the queue entry, reverts QueueEntry to WAITING.
 * Never modifies a BOOKED or LEFT QueueEntry.
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
            // Never modify a BOOKED or LEFT QueueEntry
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

function formatBooking(booking) {
    return {
        bookingId: booking.bookingId,
        offerId: booking.offerId,
        queueEntryId: booking.queueEntryId,
        customerId: booking.customerId,
        dealerId: booking.dealerId,
        inventoryId: booking.inventoryId,
        totalPrice: booking.totalPrice.toString(),
        priceSnapshot: booking.priceSnapshot,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        ...(booking.customer && {
            customer: {
                userId: booking.customer.userId,
                name: booking.customer.name,
                email: booking.customer.email,
                phone: booking.customer.phone,
            },
        }),
        ...(booking.dealer && {
            dealer: {
                dealerId: booking.dealer.dealerId,
                dealerName: booking.dealer.dealerName,
                city: booking.dealer.city,
                address: booking.dealer.address,
            },
        }),
        ...(booking.inventory && {
            inventory: {
                inventoryId: booking.inventory.inventoryId,
                variant: booking.inventory.variant,
                color: booking.inventory.color,
                ...(booking.inventory.carModel && {
                    carModel: {
                        carModelId: booking.inventory.carModel.carModelId,
                        brand: booking.inventory.carModel.brand,
                        model: booking.inventory.carModel.model,
                        imageUrl: booking.inventory.carModel.imageUrl,
                    },
                }),
            },
        }),
        ...(booking.offer && {
            offer: {
                offerId: booking.offer.offerId,
                exShowroom: booking.offer.exShowroom.toString(),
                insurance: booking.offer.insurance.toString(),
                rto: booking.offer.rto.toString(),
                accessories: booking.offer.accessories.toString(),
                discount: booking.offer.discount.toString(),
                totalPrice: booking.offer.totalPrice.toString(),
                status: booking.offer.status,
            },
        }),
        ...(booking.queueEntry && {
            queueEntry: {
                entryId: booking.queueEntry.entryId,
                queueId: booking.queueEntry.queueId,
                status: booking.queueEntry.status,
                joinedAt: booking.queueEntry.joinedAt,
            },
        }),
    };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/bookings/accept/:offerId
 * Customer accepts a PENDING offer.
 * Authoritative offer read and all validations occur inside an atomic Prisma transaction.
 */
const acceptOffer = async (req, res) => {
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

        // Execute complete booking operation inside atomic transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Authoritative fetch inside the transaction to prevent concurrent offer modification
            const offer = await tx.offer.findUnique({
                where: { offerId },
                include: {
                    queueEntry: {
                        include: {
                            queue: true,
                        },
                    },
                    inventory: true,
                    dealer: true,
                },
            });

            if (!offer) {
                const err = new Error("Offer not found");
                err.code = "OFFER_NOT_FOUND";
                throw err;
            }

            // 2. Ownership verification: Offer must belong to authenticated customer's QueueEntry
            if (offer.queueEntry.customerId !== customerId) {
                const err = new Error("You do not have permission to accept this offer");
                err.code = "FORBIDDEN";
                throw err;
            }

            // 3. Status checks
            if (offer.status === "ACCEPTED") {
                const err = new Error("Offer has already been accepted");
                err.code = "OFFER_ALREADY_ACCEPTED";
                throw err;
            }

            if (offer.status === "REJECTED") {
                const err = new Error("Cannot accept a rejected offer");
                err.code = "OFFER_ALREADY_REJECTED";
                throw err;
            }

            if (offer.status === "CANCELLED") {
                const err = new Error("Cannot accept a cancelled offer");
                err.code = "OFFER_ALREADY_CANCELLED";
                throw err;
            }

            if (offer.status === "EXPIRED" || new Date(offer.expiresAt) < new Date()) {
                // Perform transactional expiration check and reconcile QueueEntry status
                await checkAndExpireOffer(offer, tx);
                const err = new Error("Cannot accept an expired offer");
                err.code = "OFFER_EXPIRED";
                throw err;
            }

            if (offer.status !== "PENDING") {
                const err = new Error(`Cannot accept offer with status ${offer.status}`);
                err.code = "OFFER_INVALID_STATUS";
                throw err;
            }

            // 4. Verify QueueEntry eligibility
            if (offer.queueEntry.status === "BOOKED") {
                const err = new Error("This queue entry has already been booked");
                err.code = "QUEUE_ENTRY_ALREADY_BOOKED";
                throw err;
            }

            if (offer.queueEntry.status === "LEFT") {
                const err = new Error("Queue entry is no longer active");
                err.code = "QUEUE_ENTRY_LEFT";
                throw err;
            }

            // 5. Verify Queue is open
            if (offer.queueEntry.queue.status !== "OPEN") {
                const err = new Error("Queue is closed and no longer accepting bookings");
                err.code = "QUEUE_CLOSED";
                throw err;
            }

            // 6. Verify Inventory and Dealer relationship
            if (!offer.inventory) {
                const err = new Error("Associated inventory not found");
                err.code = "INVENTORY_NOT_FOUND";
                throw err;
            }

            if (offer.inventory.dealerId !== offer.dealerId) {
                const err = new Error("Inventory does not belong to the offering dealer");
                err.code = "INVENTORY_DEALER_MISMATCH";
                throw err;
            }

            if (!offer.inventory.active) {
                const err = new Error("Associated inventory is no longer active");
                err.code = "INVENTORY_INACTIVE";
                throw err;
            }

            if (offer.inventory.availableUnits <= 0) {
                const err = new Error("No available units remaining in inventory for this offer");
                err.code = "INVENTORY_UNAVAILABLE";
                throw err;
            }

            // 7. Conditional updates
            // 7a. Claim QueueEntry conditionally (must be WAITING or OFFERED)
            const claimedEntry = await tx.queueEntry.updateMany({
                where: {
                    entryId: offer.queueEntryId,
                    status: { in: ["WAITING", "OFFERED"] },
                },
                data: {
                    status: "BOOKED",
                },
            });

            if (claimedEntry.count === 0) {
                const err = new Error("This queue entry has already been booked");
                err.code = "QUEUE_ENTRY_ALREADY_BOOKED";
                throw err;
            }

            // 7b. Decrement Inventory conditionally (availableUnits must be > 0 and active)
            const updatedInventory = await tx.inventory.updateMany({
                where: {
                    inventoryId: offer.inventoryId,
                    active: true,
                    availableUnits: { gt: 0 },
                },
                data: {
                    availableUnits: { decrement: 1 },
                },
            });

            if (updatedInventory.count === 0) {
                const err = new Error("No units available in inventory for this booking");
                err.code = "INVENTORY_UNAVAILABLE";
                throw err;
            }

            // 7c. Accept the offer conditionally (must be PENDING and unexpired)
            const acceptedOffer = await tx.offer.updateMany({
                where: {
                    offerId,
                    status: "PENDING",
                    expiresAt: { gt: new Date() },
                },
                data: {
                    status: "ACCEPTED",
                },
            });

            if (acceptedOffer.count === 0) {
                const err = new Error("Offer is no longer available or has expired");
                err.code = "OFFER_NOT_AVAILABLE";
                throw err;
            }

            // 7d. Cancel all other pending offers for this QueueEntry
            await tx.offer.updateMany({
                where: {
                    queueEntryId: offer.queueEntryId,
                    offerId: { not: offerId },
                    status: "PENDING",
                },
                data: {
                    status: "CANCELLED",
                },
            });

            // 7e. Create Price Snapshot from the authoritative transaction-read offer
            const priceSnapshot = {
                exShowroom: offer.exShowroom.toString(),
                insurance: offer.insurance.toString(),
                rto: offer.rto.toString(),
                accessories: offer.accessories.toString(),
                discount: offer.discount.toString(),
                totalPrice: offer.totalPrice.toString(),
            };

            // 7f. Create or Update Booking record
            // If the customer previously had a cancelled booking on this entry and rejoined, update that booking
            const createdBooking = await tx.booking.create({
    data: {
        offerId,
        queueEntryId: offer.queueEntryId,
        customerId,
        dealerId: offer.dealerId,
        inventoryId: offer.inventoryId,
        priceSnapshot,
        totalPrice: offer.totalPrice,
        status: "CONFIRMED",
    },
    include: bookingInclude,
});

            // 7g. Record AuditLog entry
            await tx.auditLog.create({
                data: {
                    actorId: customerId,
                    action: "CREATE_BOOKING",
                    entity: "Booking",
                    entityId: createdBooking.bookingId,
                    metadata: {
                        offerId,
                        queueEntryId: offer.queueEntryId,
                        dealerId: offer.dealerId,
                        inventoryId: offer.inventoryId,
                        totalPrice: offer.totalPrice.toString(),
                    },
                },
            });

            return createdBooking;
        });

        return res.status(201).json({
            success: true,
            message: "Booking confirmed successfully",
            booking: formatBooking(result),
        });
    } catch (err) {
        if (err.code === "OFFER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: err.message,
            });
        }
        if (err.code === "FORBIDDEN") {
            return res.status(403).json({
                success: false,
                message: err.message,
            });
        }
        if (
            err.code === "OFFER_ALREADY_ACCEPTED" ||
            err.code === "OFFER_ALREADY_REJECTED" ||
            err.code === "OFFER_ALREADY_CANCELLED" ||
            err.code === "OFFER_EXPIRED" ||
            err.code === "OFFER_INVALID_STATUS" ||
            err.code === "OFFER_NOT_AVAILABLE" ||
            err.code === "QUEUE_ENTRY_ALREADY_BOOKED" ||
            err.code === "QUEUE_ENTRY_LEFT" ||
            err.code === "QUEUE_CLOSED" ||
            err.code === "INVENTORY_UNAVAILABLE"
        ) {
            return res.status(409).json({
                success: false,
                message: err.message,
            });
        }
        if (
            err.code === "INVENTORY_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message: err.message,
            });
        }
        if (
            err.code === "INVENTORY_DEALER_MISMATCH" ||
            err.code === "INVENTORY_INACTIVE"
        ) {
            return res.status(400).json({
                success: false,
                message: err.message,
            });
        }
        if (err.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A booking conflict occurred. This offer or queue entry has already been booked",
            });
        }
        if (err.code === "P2034") {
            return res.status(409).json({
                success: false,
                message: "A concurrency conflict occurred. Please retry your request",
            });
        }
        if (err.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Record not found",
            });
        }

        console.error("acceptOffer error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while processing the booking",
        });
    }
};

/**
 * GET /api/bookings/my
 * Customer views their own booking history.
 */
const getMyBookings = async (req, res) => {
    try {
        const customerId = req.user.userId;

        const bookings = await prisma.booking.findMany({
            where: { customerId },
            include: bookingInclude,
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({
            success: true,
            message: "Customer bookings retrieved successfully",
            bookings: bookings.map(formatBooking),
        });
    } catch (err) {
        console.error("getMyBookings error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving bookings",
        });
    }
};

/**
 * GET /api/bookings/dealer/my
 * Verified Dealer views bookings associated with their dealership.
 */
const getDealerBookings = async (req, res) => {
    try {
        const dealerId = req.dealer.dealerId;

        const bookings = await prisma.booking.findMany({
            where: { dealerId },
            include: bookingInclude,
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({
            success: true,
            message: "Dealer bookings retrieved successfully",
            bookings: bookings.map(formatBooking),
        });
    } catch (err) {
        console.error("getDealerBookings error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving dealer bookings",
        });
    }
};

/**
 * GET /api/bookings/:bookingId
 * Customer or Dealer views an individual booking (with strict ownership verification).
 */
const getBookingById = async (req, res) => {
    try {
        const idResult = bookingIdSchema.safeParse(req.params.bookingId);
        if (!idResult.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }
        const bookingId = idResult.data;

        const booking = await prisma.booking.findUnique({
            where: { bookingId },
            include: bookingInclude,
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Ownership verification
        if (req.user.role === "CUSTOMER") {
            if (booking.customerId !== req.user.userId) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to access this booking",
                });
            }
        } else if (req.user.role === "DEALER") {
            const dealer = await prisma.dealer.findUnique({
                where: { userId: req.user.userId },
            });
            if (!dealer || dealer.dealerId !== booking.dealerId) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to access this booking",
                });
            }
        } else {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Booking retrieved successfully",
            booking: formatBooking(booking),
        });
    } catch (err) {
        console.error("getBookingById error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while retrieving the booking",
        });
    }
};

/**
 * PATCH /api/bookings/:bookingId/cancel
 * Customer or Dealer cancels a CONFIRMED booking, restoring inventory and recording audit log.
 */
const cancelBooking = async (req, res) => {
    try {
        const idResult = bookingIdSchema.safeParse(req.params.bookingId);
        if (!idResult.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID",
            });
        }
        const bookingId = idResult.data;

        const booking = await prisma.booking.findUnique({
            where: { bookingId },
            include: {
                dealer: true,
                inventory: true,
            },
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Ownership verification
        if (req.user.role === "CUSTOMER") {
            if (booking.customerId !== req.user.userId) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to cancel this booking",
                });
            }
        } else if (req.user.role === "DEALER") {
            const dealer = await prisma.dealer.findUnique({
                where: { userId: req.user.userId },
            });
            if (!dealer || dealer.dealerId !== booking.dealerId) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to cancel this booking",
                });
            }
            if (!dealer.verified) {
                return res.status(403).json({
                    success: false,
                    message: "Your dealership is awaiting admin verification",
                });
            }
        } else {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to cancel this booking",
            });
        }

        // Status check
        if (booking.status === "CANCELLED") {
            return res.status(409).json({
                success: false,
                message: "Booking has already been cancelled",
            });
        }

        if (booking.status !== "CONFIRMED") {
            return res.status(409).json({
                success: false,
                message: `Only confirmed bookings can be cancelled. Current status is ${booking.status}`,
            });
        }

        // Execute atomic cancellation transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Conditionally update Booking status from CONFIRMED to CANCELLED
            const updatedBooking = await tx.booking.updateMany({
                where: {
                    bookingId,
                    status: "CONFIRMED",
                },
                data: {
                    status: "CANCELLED",
                },
            });

            if (updatedBooking.count === 0) {
                const err = new Error("Booking has already been cancelled");
                err.code = "BOOKING_ALREADY_CANCELLED";
                throw err;
            }

            // 2. Restore inventory exactly once
            await tx.inventory.update({
                where: { inventoryId: booking.inventoryId },
                data: {
                    availableUnits: { increment: 1 },
                },
            });

            // 3. Record AuditLog
            await tx.auditLog.create({
                data: {
                    actorId: req.user.userId,
                    action: "CANCEL_BOOKING",
                    entity: "Booking",
                    entityId: bookingId,
                    metadata: {
                        cancelledByRole: req.user.role,
                        cancelledByUserId: req.user.userId,
                        previousStatus: "CONFIRMED",
                        newStatus: "CANCELLED",
                        restoredInventoryId: booking.inventoryId,
                    },
                },
            });

            // Return updated booking
            return tx.booking.findUnique({
                where: { bookingId },
                include: bookingInclude,
            });
        });

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking: formatBooking(result),
        });
    } catch (err) {
        if (err.code === "BOOKING_ALREADY_CANCELLED" || err.message === "BOOKING_ALREADY_CANCELLED") {
            return res.status(409).json({
                success: false,
                message: "Booking has already been cancelled",
            });
        }
        if (err.code === "P2034") {
            return res.status(409).json({
                success: false,
                message: "A concurrency conflict occurred. Please retry your request",
            });
        }
        if (err.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }
        console.error("cancelBooking error:", err);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while cancelling the booking",
        });
    }
};

module.exports = {
    acceptOffer,
    getMyBookings,
    getDealerBookings,
    getBookingById,
    cancelBooking,
    checkAndExpireOffer,
    offerIdSchema,
    bookingIdSchema,
    formatBooking,
};
