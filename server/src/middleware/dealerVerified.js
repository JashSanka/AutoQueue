
const prisma = require("../config/prisma");

const dealerVerified = async (req, res, next) => {
    try {
        const dealer = await prisma.dealer.findUnique({
            where: {
                userId: req.user.userId
            }
        });

        if (!dealer) {
            return res.status(403).json({
                success: false,
                message: "Dealer profile not found"
            });
        }

        if (!dealer.verified) {
            return res.status(403).json({
                success: false,
                message: "Your dealership is awaiting admin verification"
            });
        }

        req.dealer = dealer;

        next();

    } catch (error) {
        console.error("Dealer verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify dealer status"
        });
    }
};

module.exports = dealerVerified;
