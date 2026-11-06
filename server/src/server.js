const express=require("express");
const app=express();

const PORT=3000;

app.use(express.json())

app.get("/health",(req,res)=>{
    res.status(200).json({message: "AutoQueue API running"});
});

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});
