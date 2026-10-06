const express = require("express");
const controller = require("../controllers/vip_packages.controller");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/active", controller.getActive);
router.get("/admin", requireAdmin, controller.getAll);
router.post("/admin", requireAdmin, controller.create);
router.put("/admin/:id", requireAdmin, controller.update);
router.delete("/admin/:id", requireAdmin, controller.remove);

module.exports = router;
