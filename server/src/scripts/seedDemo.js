const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");

const password = "DemoPass123!";
const cars = [
    ["Tata", "Nexon"], ["Tata", "Punch"], ["Mahindra", "XUV700"], ["Mahindra", "Thar"],
    ["Hyundai", "Creta"], ["Hyundai", "i20"], ["Maruti Suzuki", "Swift"], ["Maruti Suzuki", "Brezza"],
    ["Kia", "Seltos"], ["Toyota", "Innova Hycross"],
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
    for (const [brand, model] of cars) carRows.push(await prisma.carModel.upsert({ where: { brand_model: { brand, model } }, update: {}, create: { brand, model } }));
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
