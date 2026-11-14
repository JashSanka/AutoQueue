const prisma = require("../config/prisma");
const { z } = require("zod");

const dealerIdSchema = z.string().uuid();

const listDealers = async (req, res) => {
    try {
        const dealers = await prisma.dealer.findMany({
            select: {
                dealerId: true, dealerName: true, city: true, address: true,
                verified: true, createdAt: true,
                user: { select: { name: true, email: true, phone: true, isActive: true } },
                _count: { select: { inventory: true, bookings: true } },
            },
            orderBy: [{ verified: "asc" }, { createdAt: "asc" }],
        });
        return res.status(200).json({ success: true, dealers });
    } catch (error) {
        console.error("List dealers error:", error);
        return res.status(500).json({ success: false, message: "Unable to retrieve dealers" });
    }
};

const verifyDealer = async (req, res) => {
    try {
        const validation = dealerIdSchema.safeParse(req.params.dealerId);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid dealer ID"
            });
        }

        const { dealerId } = req.params;

        const dealer = await prisma.dealer.findUnique({
            where: { dealerId }
        });

        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer not found"
            });
        }

        if (dealer.verified) {
            return res.status(409).json({
                success: false,
                message: "Dealer is already verified"
            });
        }

        const updatedDealer = await prisma.$transaction(async (tx) => {
            const updated = await tx.dealer.update({
                where: { dealerId },
                data: { verified: true },
                select: {
                    dealerId: true,
                    dealerName: true,
                    city: true,
                    verified: true
                }
            });

            await tx.auditLog.create({
                data: {
                    actorId: req.user.userId,
                    action: "DEALER_VERIFIED",
                    entity: "Dealer",
                    entityId: dealerId,
                    metadata: {
                        dealerName: dealer.dealerName
                    }
                }
            });

            return updated;
        });

        return res.status(200).json({
            success: true,
            message: "Dealer verified successfully",
            dealer: updatedDealer
        });

    } catch (error) {
        console.error("Dealer verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify dealer"
        });
    }
};

module.exports = { verifyDealer, listDealers };
