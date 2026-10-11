const express = require("express");
const router = express.Router();
const controller = require("../controllers/transactions.controller");
const requireUser = require("../middleware/requireUser");

router.get("/", requireUser, controller.getAll);
router.get("/user/:userId", requireUser, controller.getByUser);
router.get("/:id", requireUser, controller.getById);
router.post("/", requireUser, controller.create);
router.post(
  "/dev/:id/simulate-success",
  requireUser,
  controller.simulateSuccess,
);
router.patch("/:id/status", requireUser, controller.updateStatus);

module.exports = router;
