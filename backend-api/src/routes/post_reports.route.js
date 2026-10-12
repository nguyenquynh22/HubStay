const express = require("express");
const controller = require("../controllers/post_reports.controller");
const requireAdmin = require("../middleware/requireAdmin");
const requireUser = require("../middleware/requireUser");
const router = express.Router();

router.get("/", requireAdmin, controller.getAll);
router.get("/:id", requireAdmin, controller.getById);
router.get("/eligibility/:postId", requireUser, controller.getEligibility);
router.post("/", requireUser, controller.create);
router.put("/:id", requireAdmin, controller.update);
router.delete("/:id", requireAdmin, controller.delete);

module.exports = router;
