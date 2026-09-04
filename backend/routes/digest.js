const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getDigest, markDigestSeen } = require('../controllers/digestController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getDigest);
router.post('/mark-seen', markDigestSeen);

module.exports = router;