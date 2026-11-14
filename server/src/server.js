require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const app = express();

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const carRoutes = require("./routes/car.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const queueRoutes = require("./routes/queue.routes");
const offerRoutes = require("./routes/offer.routes");
const bookingRoutes = require("./routes/booking.routes");

const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "6mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), { fallthrough: false }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/queues", queueRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/bookings", bookingRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ message: "AutoQueue API running" });
});

const server = app.listen(PORT, () => {
    console.log(`AutoQueue server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use by another process.`);
        console.error(`To free port ${PORT}, run: kill $(lsof -t -i:${PORT})`);
        process.exit(1);
    } else {
        console.error("Server error:", err);
        process.exit(1);
    }
});
