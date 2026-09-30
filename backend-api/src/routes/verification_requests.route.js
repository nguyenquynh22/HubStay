const express = require("express");
const controller = require("../controllers/verification_requests.controller");
const router = express.Router();

router.get("/", controller.getAll);
router.post("/dev-verify/:userId", controller.devVerify);
router.get("/user/:userId", controller.getByUser);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.post("/:id/approve", controller.approve);
router.post("/:id/reject", controller.reject);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

module.exports = router;
