const express = require("express");
const controller = require("../controllers/appointments.controller");
const router = express.Router();

router.get("/landlord/:userId", controller.getForLandlord);
router.get("/tenant/:userId", controller.getForTenant);
router.post("/", controller.create);
router.put("/:id", controller.update);

module.exports = router;
