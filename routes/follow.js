const express = require('express');
const router = express.Router();
const FollowController = require('../controllers/follow');
const auth = require('../middlewares/auth');

// Rutas de follows
router.post('/save', auth, FollowController.save);
router.delete('/unfollow/:id', auth, FollowController.unfollow);
router.get('/following/:id?', auth, FollowController.following);
router.get('/followers/:id?', auth, FollowController.followers);
router.get('/ids', auth, FollowController.followUserIds);

module.exports = router;
