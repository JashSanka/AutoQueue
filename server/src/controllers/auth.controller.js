const prisma=require("../config/prisma");
const bcrypt=require("bcrypt");
const { z }=require("zod");
const jwt=require("jsonwebtoken");


const registerSchema = z.object({
    name: z.string().trim().min(2).max(80),

    email: z.email()
        .trim()
        .transform(value => value.toLowerCase()),

    password: z.string().min(8).refine(
        value => Buffer.byteLength(value, "utf8") <= 72,
        "Password must not exceed 72 bytes"
    ),

    phone: z.string().trim().regex(
        /^\+?[0-9\s-]{7,15}$/,
        "Enter a valid phone number"
    ),

    role: z.enum(["CUSTOMER", "DEALER"]).default("CUSTOMER"),

    dealerName: z.string().trim().min(2).max(100).optional(),

    city: z.string().trim().min(2).max(80).optional(),

    address: z.string().trim().min(5).optional()

}).superRefine((data, ctx) => {

    if (data.role === "DEALER") {
        if (!data.dealerName) {
            ctx.addIssue({
                code: "custom",
                path: ["dealerName"],
                message: "Dealer name is required"
            });
        }

        if (!data.city) {
            ctx.addIssue({
                code: "custom",
                path: ["city"],
                message: "City is required"
            });
        }

        if (!data.address) {
            ctx.addIssue({
                code: "custom",
                path: ["address"],
                message: "Address is required"
            });
        }
    }
});

const register = async (req, res) => {
    try {
        const validation = registerSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid registration details",
                errors: validation.error.issues.map(issue => ({
                    field: issue.path[0],
                    message: issue.message
                }))
            });
        }

        const {
            name,
            email,
            password,
            phone,
            role,
            dealerName,
            city,
            address
        } = validation.data;

        const existence = await prisma.user.findUnique({
            where: { email }
        });

        if (existence) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await prisma.$transaction(async (tx) => {

            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                    phone,
                    role
                },
                select: {
                    userId: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    createdAt: true
                }
            });

            let dealer = null;

            if (role === "DEALER") {
                dealer = await tx.dealer.create({
                    data: {
                        userId: user.userId,
                        dealerName,
                        city,
                        address,
                        verified: false
                    }
                });
            }

            return { user, dealer };
        });

        return res.status(201).json({
            success: true,
            message: `${role} registered successfully`,
            user: result.user,
            dealer: result.dealer ? {
                dealerId: result.dealer.dealerId,
                dealerName: result.dealer.dealerName,
                city: result.dealer.city,
                verified: result.dealer.verified
            } : undefined
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Something went wrong during registration"
        });
    }
};

const loginSchema = z.object({
    email: z.email()
        .trim()
        .transform(value => value.toLowerCase()),

    password: z.string().min(1, "Password is required")
});
const login=async (req,res)=>{
    try{
        const validation = loginSchema.safeParse(req.body);
        if(!validation.success){
            return res.status(400).json({
                success: false,
                message: "Invalid login details",
                errors: validation.error.issues.map(issue => ({
                    field: issue.path[0],
                    message: issue.message
                }))
            });
        }
        const {email,password}=validation.data;
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been suspended"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign(
            {
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                subject: user.userId,
                expiresIn: process.env.JWT_EXPIRES_IN || "1h"
            }
        );
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    }catch(error){
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during login"
        });
    }
};

const getMe=async (req,res)=>{
    try{
        return res.status(200).json({
            success: true,
            user: req.user
        });
    }
    catch(error){
        console.error("Get profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch user profile"
        });
    }
}
module.exports = { register,login,getMe };