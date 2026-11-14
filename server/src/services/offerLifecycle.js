/**
 * Keeps offer expiry and queue-entry reconciliation in one place.  The helper
 * is deliberately safe to call from reads as well as transactions.
 */
async function expireOfferIfNeeded(offer, tx) {
    if (offer.status !== "PENDING" || new Date(offer.expiresAt) >= new Date()) {
        return { offer, expired: false };
    }

    const expired = await tx.offer.updateMany({
        where: {
            offerId: offer.offerId,
            status: "PENDING",
            updatedAt: offer.updatedAt,
        },
        data: { status: "EXPIRED" },
    });

    // Another request changed the offer after it was read.  Return its current
    // state rather than overwriting that change.
    if (expired.count === 0) {
        const current = await tx.offer.findUnique({ where: { offerId: offer.offerId } });
        return { offer: current || offer, expired: current?.status === "EXPIRED" };
    }

    const entry = await tx.queueEntry.findUnique({
        where: { entryId: offer.queueEntryId },
        include: { queue: { select: { status: true } } },
    });
    const pendingOffers = await tx.offer.count({
        where: {
            queueEntryId: offer.queueEntryId,
            status: "PENDING",
            expiresAt: { gt: new Date() },
        },
    });

    if (
        pendingOffers === 0 &&
        entry?.status === "OFFERED" &&
        entry.queue.status === "OPEN"
    ) {
        await tx.queueEntry.updateMany({
            where: { entryId: entry.entryId, status: "OFFERED" },
            data: { status: "WAITING" },
        });
    }

    return { offer: { ...offer, status: "EXPIRED" }, expired: true };
}

module.exports = { expireOfferIfNeeded };
