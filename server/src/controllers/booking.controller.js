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

module.exports = {
    offerIdSchema,
    bookingIdSchema,
    formatBooking,
};
