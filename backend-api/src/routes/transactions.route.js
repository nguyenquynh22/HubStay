const express = require("express");
const router = express.Router();
const controller = require("../controllers/transactions.controller");

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.get("/user/:userId", controller.getByUser);
router.post("/", controller.create);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;