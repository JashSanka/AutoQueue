const prisma = require("../config/prisma");
const { z } = require("zod");

// ─── Schemas ─────────────────────────────────────────────────────────────────

const offerIdSchema = z.uuid({ message: "Invalid offer ID" });
const bookingIdSchema = z.uuid({ message: "Invalid booking ID" });

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
 * Customer accepts a PENDING offer, atomically creating a booking and decrementing inventory.
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

        // 1. Fetch offer with relations
        const offer = await prisma.offer.findUnique({
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
            return res.status(404).json({
                success: false,
                message: "Offer not found",
            });
        }

        // 2. Ownership verification: Offer must belong to authenticated customer's QueueEntry
        if (offer.queueEntry.customerId !== customerId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to accept this offer",
            });
        }

        // 3. Status checks
        if (offer.status === "ACCEPTED") {
            return res.status(409).json({
                success: false,
                message: "Offer has already been accepted",
            });
        }

        if (offer.status === "REJECTED") {
            return res.status(409).json({
                success: false,
                message: "Cannot accept a rejected offer",
            });
        }

        if (offer.status === "CANCELLED") {
            return res.status(409).json({
                success: false,
                message: "Cannot accept a cancelled offer",
            });
        }

        if (offer.status === "EXPIRED" || new Date(offer.expiresAt) < new Date()) {
            if (offer.status === "PENDING") {
                await prisma.offer.update({
                    where: { offerId },
                    data: { status: "EXPIRED" },
                }).catch(() => {});
            }
            return res.status(409).json({
                success: false,
                message: "Cannot accept an expired offer",
            });
        }

        if (offer.status !== "PENDING") {
            return res.status(409).json({
                success: false,
                message: `Cannot accept offer with status ${offer.status}`,
            });
        }

        // 4. Verify QueueEntry eligibility
        if (offer.queueEntry.status === "BOOKED") {
            return res.status(409).json({
                success: false,
                message: "This queue entry has already been booked",
            });
        }

        if (offer.queueEntry.status === "LEFT") {
            return res.status(409).json({
                success: false,
                message: "Queue entry is no longer active",
            });
        }

        // 5. Verify Queue is open
        if (offer.queueEntry.queue.status !== "OPEN") {
            return res.status(409).json({
                success: false,
                message: "Queue is closed and no longer accepting bookings",
            });
        }

        // 6. Verify Inventory
        if (!offer.inventory) {
            return res.status(404).json({
                success: false,
                message: "Associated inventory not found",
            });
        }

        if (offer.inventory.dealerId !== offer.dealerId) {
            return res.status(400).json({
                success: false,
                message: "Inventory does not belong to the offering dealer",
            });
        }

        if (!offer.inventory.active) {
            return res.status(400).json({
                success: false,
                message: "Associated inventory is no longer active",
            });
        }

        if (offer.inventory.availableUnits <= 0) {
            return res.status(409).json({
                success: false,
                message: "No available units remaining in inventory for this offer",
            });
        }

        // 7. Atomic transaction
        const result = await prisma.$transaction(async (tx) => {
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
                const err = new Error("QUEUE_ENTRY_ALREADY_BOOKED");
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
                const err = new Error("INVENTORY_UNAVAILABLE");
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
                const err = new Error("OFFER_NOT_AVAILABLE");
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

            // 7e. Create Price Snapshot
            const priceSnapshot = {
                exShowroom: offer.exShowroom.toString(),
                insurance: offer.insurance.toString(),
                rto: offer.rto.toString(),
                accessories: offer.accessories.toString(),
                discount: offer.discount.toString(),
                totalPrice: offer.totalPrice.toString(),
            };

            // 7f. Create Booking record
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
                include: {
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
                        include: {
                            carModel: true,
                        },
                    },
                    offer: true,
                    queueEntry: true,
                },
            });

            // 7g. Create AuditLog entry
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
        if (err.code === "QUEUE_ENTRY_ALREADY_BOOKED" || err.message === "QUEUE_ENTRY_ALREADY_BOOKED") {
            return res.status(409).json({
                success: false,
                message: "This queue entry has already been booked",
            });
        }
        if (err.code === "INVENTORY_UNAVAILABLE" || err.message === "INVENTORY_UNAVAILABLE") {
            return res.status(409).json({
                success: false,
                message: "No units available in inventory for this booking",
            });
        }
        if (err.code === "OFFER_NOT_AVAILABLE" || err.message === "OFFER_NOT_AVAILABLE") {
            return res.status(409).json({
                success: false,
                message: "Offer is no longer available or has expired",
            });
        }
        if (err.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A booking conflict occurred. This offer or queue entry has already been booked",
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
                    include: {
                        carModel: true,
                    },
                },
                offer: true,
                queueEntry: true,
            },
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
            include: {
                customer: {
                    select: {
                        userId: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                inventory: {
                    include: {
                        carModel: true,
                    },
                },
                offer: true,
                queueEntry: true,
            },
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
 * Customer or Dealer views an individual booking (with ownership verification).
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
            include: {
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
                    include: {
                        carModel: true,
                    },
                },
                offer: true,
                queueEntry: true,
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

module.exports = {
    acceptOffer,
    getMyBookings,
    getDealerBookings,
    getBookingById,
    offerIdSchema,
    bookingIdSchema,
    formatBooking,
};
