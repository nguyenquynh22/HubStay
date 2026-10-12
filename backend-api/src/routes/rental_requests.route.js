const express = require("express");
const router = express.Router();
const controller = require("../controllers/rental_requests.controller");
const requireAdmin = require("../middleware/requireAdmin");
const requireUser = require("../middleware/requireUser");

router.get("/", requireAdmin, controller.getAll);
router.get("/user/:userId", requireUser, controller.getForUser);
router.get("/:id", requireUser, controller.getById);
router.get("/post/:postId", requireUser, controller.getByPost);
router.post("/", requireUser, controller.create);
router.post("/post/:postId/rent-out", requireUser, controller.markPostRented);
router.post("/post/:postId/reopen", requireUser, controller.reopenPost);
router.patch("/:id/status", requireUser, controller.updateStatus);
router.delete("/:id", requireAdmin, controller.delete);

module.exports = router;
