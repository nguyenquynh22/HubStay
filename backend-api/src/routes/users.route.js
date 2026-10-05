const express = require("express");
const controller = require("../controllers/users.controller");
const requireAdmin = require("../middleware/requireAdmin");
const router = express.Router();

router.get("/", requireAdmin, controller.getAll);
router.get("/status/:id", controller.getStatus);
router.get("/admin/:id", requireAdmin, controller.getAdminById);
router.get("/:id", controller.getById);
router.post("/", requireAdmin, controller.create);
router.put("/admin/:id", requireAdmin, controller.update);
router.put("/:id", controller.updateProfile);
router.delete("/admin/:id", requireAdmin, controller.delete);

module.exports = router;
