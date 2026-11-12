const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");
const { z } = require("zod");

// ─── Schemas ─────────────────────────────────────────────────────────────────

const offerIdSchema = z.uuid({ message: "Invalid offer ID" });
const queueIdSchema = z.uuid({ message: "Invalid queue ID" });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateTotalPrice({ exShowroom, insurance, rto, accessories, discount }) {
    const ex = new Prisma.Decimal(exShowroom.toString());
    const ins = new Prisma.Decimal(insurance.toString());
    const r = new Prisma.Decimal(rto.toString());
    const acc = new Prisma.Decimal(accessories.toString());
    const disc = new Prisma.Decimal((discount ?? 0).toString());
    return ex.plus(ins).plus(r).plus(acc).minus(disc);
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

module.exports = {
    getEligibleQueueEntries,
};
