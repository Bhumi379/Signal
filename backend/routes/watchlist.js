const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  getWatchlistCount,
} = require('../controllers/watchlistController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', addToWatchlist);
router.get('/count', getWatchlistCount);
router.get('/', getWatchlist);
router.delete('/:symbol', removeFromWatchlist);

module.exports = router;
