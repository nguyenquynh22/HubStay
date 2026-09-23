const express = require("express");
const router = express.Router();
const controller = require("../controllers/rental_requests.controller");

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.get("/post/:postId", controller.getByPost);
router.post("/", controller.create);
router.patch("/:id/status", controller.updateStatus);
router.delete("/:id", controller.delete);

module.exports = router;