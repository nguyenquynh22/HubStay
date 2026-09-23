const express = require("express");
const controller = require("../controllers/posts.controller");
const router = express.Router();

router.get("/nearby", controller.getNearbyByLandmark);
router.get("/landmark/:landmarkId/nearby", controller.getNearbyByLandmark);
router.get("/distance/:postId", controller.getDistanceToPost);
router.get("/user/:userId", controller.getByAuthor);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

module.exports = router;
