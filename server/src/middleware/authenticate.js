const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const authenticate=async (req,res,next)=>{
    try{
        const authHeader=req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                success: false,
                message: "Authentication token required"
            });
        }

        const token=authHeader.split(" ")[1];
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        const user=await prisma.user.findUnique({
            where:{
                userId: decoded.sub
            },
            select: {
                userId: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true
            }
        });
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "User not found or account is inactive"
            });
        }
        req.user=user;
        next();
    }
    catch{
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
};
module.exports = authenticate;