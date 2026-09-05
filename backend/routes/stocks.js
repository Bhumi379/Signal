const express = require('express');
const { searchSymbol } = require('../services/finnhubService');
const { getYahooQuote, searchYahooSymbol } = require('../services/yahooFinanceService');

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    let results = [];
    try {
      results = await searchYahooSymbol(req.query.query);
    } catch {
      results = [];
    }
    if (!results.length) {
      results = await searchSymbol(req.query.query);
    }
    res.json(results.slice(0, 8));
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const quote = await getYahooQuote(req.params.symbol);
    res.json(quote);
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
});

module.exports = router;