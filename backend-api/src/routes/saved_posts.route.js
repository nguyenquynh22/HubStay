const express = require("express");
const controller = require("../controllers/saved_posts.controller");
const requireAdmin = require("../middleware/requireAdmin");
const requireUser = require("../middleware/requireUser");
const router = express.Router();

router.get("/", requireAdmin, controller.getAll);
router.get("/user/:userId", requireUser, controller.getByUser);
router.post("/", requireUser, controller.create);

module.exports = router;
