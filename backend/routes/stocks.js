const express = require('express');
const { getQuote } = require('../services/finnhubService');

const router = express.Router();

router.get('/:symbol', async (req, res) => {
  try {
    const quote = await getQuote(req.params.symbol);
    res.json(quote);
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
});

module.exports = router;