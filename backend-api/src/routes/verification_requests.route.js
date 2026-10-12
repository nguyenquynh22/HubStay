const express = require("express");
const controller = require("../controllers/verification_requests.controller");
const requireAdmin = require("../middleware/requireAdmin");
const requireUser = require("../middleware/requireUser");
const router = express.Router();

router.get("/", requireAdmin, controller.getAll);
router.post("/dev-verify/:userId", requireUser, controller.devVerify);
router.get("/user/:userId", requireUser, controller.getByUser);
router.get("/:id", requireAdmin, controller.getById);
router.post("/", requireUser, controller.create);
router.post("/:id/approve", requireAdmin, controller.approve);
router.post("/:id/reject", requireAdmin, controller.reject);
router.put("/:id", requireAdmin, controller.update);
router.delete("/:id", requireAdmin, controller.delete);

module.exports = router;
