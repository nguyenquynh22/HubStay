const express = require("express");
const controller = require("../controllers/notifications.controller");
const router = express.Router();

router.get("/user/:userId", controller.getByUser);
router.patch("/user/:userId/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);

module.exports = router;
