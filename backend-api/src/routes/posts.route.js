const express = require("express");
const controller = require("../controllers/posts.controller");
const requireUser = require("../middleware/requireUser");
const router = express.Router();

router.get("/nearby", controller.getNearbyByLandmark);
router.get("/landmark/:landmarkId/nearby", controller.getNearbyByLandmark);
router.get("/search", controller.search);
router.get("/distance/:postId", controller.getDistanceToPost);
router.get("/user/:userId", requireUser, controller.getByAuthor);
router.get("/:id", controller.getById);
router.post("/", requireUser, controller.create);
router.patch("/:id/visibility", requireUser, controller.setVisibility);
router.put("/:id", requireUser, controller.update);
router.delete("/:id", requireUser, controller.delete);

module.exports = router;
