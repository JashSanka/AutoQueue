require("dotenv").config();
const express = require("express");
const app = express();

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const carRoutes = require("./routes/car.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const queueRoutes = require("./routes/queue.routes");
const offerRoutes = require("./routes/offer.routes");

const PORT = 3000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/queues", queueRoutes);
app.use("/api/offers", offerRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ message: "AutoQueue API running" });
});

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});
