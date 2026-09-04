const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
} = require('../controllers/watchlistController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', addToWatchlist);
router.get('/', getWatchlist);
router.delete('/:symbol', removeFromWatchlist);

module.exports = router;
