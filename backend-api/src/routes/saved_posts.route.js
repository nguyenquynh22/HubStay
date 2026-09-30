const express = require('express');
const controller = require('../controllers/saved_posts.controller');
const router = express.Router();

router.get('/', controller.getAll);
router.get('/user/:userId', controller.getByUser);
router.post('/', controller.create);

module.exports = router;
