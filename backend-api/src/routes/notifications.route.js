const express = require("express");
const controller = require("../controllers/notifications.controller");
const requireUser = require("../middleware/requireUser");
const router = express.Router();

router.get("/user/:userId", requireUser, controller.getByUser);
router.patch("/user/:userId/read-all", requireUser, controller.markAllRead);
router.delete("/user/:userId/selected", requireUser, controller.deleteSelected);
router.delete("/user/:userId", requireUser, controller.deleteAll);
router.patch("/:id/read", requireUser, controller.markRead);
router.delete("/:id", requireUser, controller.deleteOne);

module.exports = router;
