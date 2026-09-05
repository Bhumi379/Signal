const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getNotifications,
  markNotificationRead,
} = require('../controllers/notificationsController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getNotifications);
router.post('/:eventId/read', markNotificationRead);

module.exports = router;
