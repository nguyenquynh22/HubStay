const express = require("express");
const router = express.Router();
const controller = require("../controllers/subscriptions.controller");
const requireUser = require("../middleware/requireUser");

router.get("/", requireUser, controller.getAll);
router.post("/dev-activate", requireUser, controller.activateDev);
router.get("/packages", controller.getPackages);
router.post("/purchase", requireUser, controller.purchase);
router.get("/user/:userId", requireUser, controller.getByUser);
router.get("/:id", requireUser, controller.getById);
router.post("/", requireUser, controller.create);
router.patch("/:id/status", requireUser, controller.updateStatus);

module.exports = router;
