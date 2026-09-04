const express = require('express');
const { getQuote, searchSymbol } = require('../services/finnhubService');

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const results = await searchSymbol(req.query.query);
    res.json(results.slice(0, 8));
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const quote = await getQuote(req.params.symbol);
    res.json(quote);
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
});

module.exports = router;