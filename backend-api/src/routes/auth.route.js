const express = require("express");
const controller = require("../controllers/auth.controller");
const router = express.Router();

router.post("/register", controller.register);
router.post("/register/verify-otp", controller.verifyRegistrationOtp);
router.post("/register/resend-otp", controller.resendRegistrationOtp);
router.post("/login", controller.login);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

module.exports = router;
