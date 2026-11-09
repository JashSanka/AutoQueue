require("dotenv").config();
const express=require("express");
const app=express();
const authRoutes=require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");

app.use("/api/admin", adminRoutes);
const PORT=3000;

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/health",(req,res)=>{
    res.status(200).json({message: "AutoQueue API running"});
});

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});
