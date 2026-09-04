const WatchlistItem = require('../models/WatchlistItem');
const { getQuote } = require('../services/finnhubService');

function normalizeSymbol(symbol) {
  if (typeof symbol !== 'string' || !symbol.trim()) {
    return null;
  }
  return symbol.trim().toUpperCase();
}

async function addToWatchlist(req, res) {
  try {
    const symbol = normalizeSymbol(req.body.symbol);

    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    const existing = await WatchlistItem.findOne({
      userId: req.userId,
      symbol,
    });

    if (existing) {
      return res.status(409).json({
        message: `${symbol} is already in your watchlist`,
      });
    }

    const item = await WatchlistItem.create({
      userId: req.userId,
      symbol,
    });

    res.status(201).json({
      symbol: item.symbol,
      addedAt: item.addedAt,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: `${normalizeSymbol(req.body.symbol)} is already in your watchlist`,
      });
    }
    res.status(500).json({ message: 'Server error adding to watchlist' });
  }
}

async function removeFromWatchlist(req, res) {
  try {
    const symbol = normalizeSymbol(req.params.symbol);

    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    const item = await WatchlistItem.findOneAndDelete({
      userId: req.userId,
      symbol,
    });

    if (!item) {
      return res.status(404).json({
        message: `${symbol} is not in your watchlist`,
      });
    }

    res.json({ message: `${symbol} removed from watchlist` });
  } catch (err) {
    res.status(500).json({ message: 'Server error removing from watchlist' });
  }
}

async function getWatchlist(req, res) {
  try {
    const items = await WatchlistItem.find({ userId: req.userId })
      .select('symbol addedAt')
      .sort({ addedAt: -1 });

    const itemsWithQuotes = await Promise.all(
      items.map(async (item) => {
        const watchlistItem = item.toObject();

        try {
          return {
            ...watchlistItem,
            quote: await getQuote(item.symbol),
          };
        } catch (quoteError) {
          return {
            ...watchlistItem,
            quote: null,
          };
        }
      }),
    );

    res.json(itemsWithQuotes);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching watchlist' });
  }
}

module.exports = { addToWatchlist, removeFromWatchlist, getWatchlist };
