const express = require("express");
const controller = require("../controllers/chat.controller");
const requireUser = require("../middleware/requireUser");
const router = express.Router();
router.post("/conversations", requireUser, controller.createOrGet);
router.get("/conversations/user/:userId", requireUser, controller.list);
router.get("/conversations/:id/messages", requireUser, controller.messages);
module.exports = router;
