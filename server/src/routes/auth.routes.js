const express=require("express");
const router=express.Router();

const { register,login,getMe }=require("../controllers/auth.controller");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const dealerVerified = require("../middleware/dealerVerified");

router.post("/register",register);
router.post("/login", login);

router.get("/me",authenticate, getMe);

router.get("/admin-test",authenticate,authorize("ADMIN"),(req,res)=>{
    res.status(200).json({
        success: true,
        message: "Welcome admin"
    });
});

router.get(
    "/dealer-test",
    authenticate,
    authorize("DEALER"),
    dealerVerified,
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Dealer verified successfully!",
            dealer: {
                dealerId: req.dealer.dealerId,
                dealerName: req.dealer.dealerName
            }
        });
    }
);

module.exports=router;