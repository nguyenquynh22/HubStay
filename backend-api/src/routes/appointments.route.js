const express = require("express");
const controller = require("../controllers/appointments.controller");
const requireUser = require("../middleware/requireUser");
const router = express.Router();

router.get("/landlord/:userId", requireUser, controller.getForLandlord);
router.get("/tenant/:userId", requireUser, controller.getForTenant);
router.post("/", requireUser, controller.create);
router.put("/:id", requireUser, controller.update);

module.exports = router;
