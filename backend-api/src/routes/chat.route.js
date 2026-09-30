const express = require("express");
const controller = require("../controllers/chat.controller");
const router = express.Router();
router.post("/conversations", controller.createOrGet);
router.get("/conversations/user/:userId", controller.list);
router.get("/conversations/:id/messages", controller.messages);
module.exports = router;
