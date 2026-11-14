const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");

const password = "DemoPass123!";
const cars = [
    ["Tata", "Nexon", "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"],
    ["Tata", "Punch", "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80"],
    ["Mahindra", "XUV700", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80"],
    ["Mahindra", "Thar", "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80"],
    ["Hyundai", "Creta", "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80"],
    ["Hyundai", "i20", "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80"],
    ["Maruti Suzuki", "Swift", "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80"],
    ["Maruti Suzuki", "Brezza", "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80"],
    ["Kia", "Seltos", "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=800&q=80"],
    ["Toyota", "Innova Hycross", "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80"],
];
const dealers = [
    { name: "Nexon Motors Mumbai", email: "mumbai.dealer@autoqueue.demo", phone: "+919800000101", city: "Mumbai", address: "Andheri East, Mumbai" },
    { name: "Pune Auto Gallery", email: "pune.dealer@autoqueue.demo", phone: "+919800000102", city: "Pune", address: "Baner Road, Pune" },
    { name: "Bengaluru Drive", email: "bengaluru.dealer@autoqueue.demo", phone: "+919800000103", city: "Bengaluru", address: "Indiranagar, Bengaluru" },
    { name: "Delhi Mobility", email: "delhi.dealer@autoqueue.demo", phone: "+919800000104", city: "Delhi", address: "Connaught Place, Delhi" },
    { name: "Hyderabad Wheels", email: "hyderabad.dealer@autoqueue.demo", phone: "+919800000105", city: "Hyderabad", address: "Banjara Hills, Hyderabad" },
];

async function ensureUser({ name, email, phone, role }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing;
    return prisma.user.create({ data: { name, email, phone, role, passwordHash: await bcrypt.hash(password, 10) } });
}

async function seedDemo() {
    if (process.env.DEMO_SEED !== "true") {
        throw new Error("Refusing to seed: set DEMO_SEED=true explicitly for a local development database.");
    }
    const admin = await ensureUser({ name: "Demo Administrator", email: "admin@autoqueue.demo", phone: "+919800000001", role: "ADMIN" });
    const customer = await ensureUser({ name: "Demo Customer", email: "customer@autoqueue.demo", phone: "+919800000002", role: "CUSTOMER" });
    const carRows = [];
    for (const [brand, model, imageUrl] of cars) {
        carRows.push(
            await prisma.carModel.upsert({
                where: { brand_model: { brand, model } },
                update: { imageUrl },
                create: { brand, model, imageUrl }
            })
        );
    }
    const dealerRows = [];
    for (const dealer of dealers) {
        const user = await ensureUser({ name: dealer.name, email: dealer.email, phone: dealer.phone, role: "DEALER" });
        let profile = await prisma.dealer.findUnique({ where: { userId: user.userId } });
        if (!profile) profile = await prisma.dealer.create({ data: { userId: user.userId, dealerName: dealer.name, city: dealer.city, address: dealer.address, verified: true } });
        dealerRows.push(profile);
    }
    const inventorySpecs = [
        [0, 0, "Creative+", "Pristine White", 5, 1450000], [0, 1, "Fearless+", "Daytona Grey", 3, 1510000],
        [1, 1, "Accomplished", "Tornado Red", 4, 890000], [2, 2, "AX7", "Midnight Black", 2, 2450000],
        [4, 2, "SX(O)", "Atlas White", 6, 1900000], [5, 2, "Asta", "Fiery Red", 4, 930000],
        [6, 3, "ZXi+", "Pearl Arctic White", 7, 880000], [8, 3, "GT Line", "Glacier White", 3, 2050000],
        [9, 4, "ZX", "Silver Metallic", 0, 3150000], [3, 4, "LX Hard Top", "Red Rage", 2, 1760000],
    ];
    for (const [carIndex, dealerIndex, variant, color, units, base] of inventorySpecs) {
        const car = carRows[carIndex]; const dealer = dealerRows[dealerIndex];
        await prisma.inventory.upsert({
            where: { dealerId_carModelId_variant_color: { dealerId: dealer.dealerId, carModelId: car.carModelId, variant, color } },
            update: {},
            create: { dealerId: dealer.dealerId, carModelId: car.carModelId, variant, color, totalUnits: Math.max(units, 2), availableUnits: units, exShowroom: base, insurance: 50000, rto: Math.round(base * 0.1), accessories: 15000, discount: 10000, active: true },
        });
    }
    console.log(`Seeded or preserved ${carRows.length} cars, ${dealerRows.length} dealers, ${inventorySpecs.length} inventory records.`);
    console.log("Demo credentials: admin@autoqueue.demo, customer@autoqueue.demo, mumbai.dealer@autoqueue.demo / DemoPass123!");
    return { admin, customer };
}

if (require.main === module) seedDemo().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
module.exports = seedDemo;
