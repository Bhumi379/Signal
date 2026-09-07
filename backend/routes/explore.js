const express = require('express');
const ChangeEvent = require('../models/ChangeEvent');
const StockSnapshot = require('../models/StockSnapshot');
const { getYahooQuote } = require('../services/yahooFinanceService');

const router = express.Router();
const CACHE_TTL_MS = 60 * 1000;
const QUOTE_BATCH_SIZE = 10;
const QUOTE_BATCH_DELAY_MS = 10 * 1000;
let cachedResponse = null;
let cachedAt = 0;
let pendingLoad = null;

const curatedStocks = require('../data/curatedStocks');
router.get('/', async (req, res) => {
  try {
    if (cachedResponse && Date.now() - cachedAt < CACHE_TTL_MS) {
      console.info('[explore-cache] hit');
      return res.json(cachedResponse);
    }

    if (!pendingLoad) {
      console.info(`[explore-cache] miss; refreshing ${curatedStocks.length} symbols in batches of ${QUOTE_BATCH_SIZE}`);
      pendingLoad = loadExploreData()
        .then((response) => {
          cachedResponse = response;
          cachedAt = Date.now();
          return response;
        })
        .finally(() => {
          pendingLoad = null;
        });
    } else {
      console.info('[explore-cache] refresh already in progress');
    }

    return res.json(await pendingLoad);
  } catch (error) {
    return res.status(502).json({ message: 'Unable to load explore data' });
  }
});

module.exports = router;
