const path = require("path");
const dotenv = require("dotenv");

// Load environment variables before importing Prisma client
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");

const SALT_ROUNDS = 10;

async function seedAdmin() {
    try {
        const adminName = process.env.ADMIN_NAME;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminPhone = process.env.ADMIN_PHONE;

        const missing = [];
        if (!adminName || !adminName.trim()) missing.push("ADMIN_NAME");
        if (!adminEmail || !adminEmail.trim()) missing.push("ADMIN_EMAIL");
        if (!adminPassword) missing.push("ADMIN_PASSWORD");
        if (!adminPhone || !adminPhone.trim()) missing.push("ADMIN_PHONE");

        if (missing.length > 0) {
            console.error(`[Error] Missing required environment variable(s): ${missing.join(", ")}`);
            process.exitCode = 1;
            return;
        }

        const name = adminName.trim();
        const email = adminEmail.trim().toLowerCase();
        const password = adminPassword;
        const phone = adminPhone.trim();

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log(`[Notice] User with email "${email}" already exists (Role: ${existingUser.role}). Skipping admin account creation.`);
            return {
                skipped: true,
                message: `User with email "${email}" already exists`,
                user: {
                    userId: existingUser.userId,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role,
                    isActive: existingUser.isActive
                }
            };
        }


        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create the admin user
        const newAdmin = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                phone,
                role: "ADMIN",
                isActive: true
            },
            select: {
                userId: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });

        console.log("[Success] Admin user created successfully!");
        console.log("Admin details (safe):");
        console.log(JSON.stringify(newAdmin, null, 2));

        return {
            success: true,
            user: newAdmin
        };
    } catch (error) {
        console.error("[Error] An error occurred while seeding admin user:", error.message || error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    seedAdmin();
}

module.exports = seedAdmin;

