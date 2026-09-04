const StockSnapshot = require('../models/StockSnapshot');
const WatchlistItem = require('../models/WatchlistItem');
const { getQuote } = require('./finnhubService');
const { detectMeaningfulChange } = require('./changeDetectionService');

async function takeSnapshot(symbol) {
  const normalizedSymbol = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';

  if (!normalizedSymbol) {
    throw new Error('A stock symbol is required to take a snapshot');
  }

  const quote = await getQuote(normalizedSymbol);
  const snapshot = {
    symbol: normalizedSymbol,
    price: quote.currentPrice,
    timestamp: new Date(),
  };

  if (typeof quote.volume === 'number') {
    snapshot.volume = quote.volume;
  }

  return StockSnapshot.create(snapshot);
}

async function collectSnapshotsForAllWatchedSymbols() {
  const symbols = await WatchlistItem.distinct('symbol');
  const uniqueSymbols = [...new Set(
    symbols
      .filter((symbol) => typeof symbol === 'string' && symbol.trim())
      .map((symbol) => symbol.trim().toUpperCase()),
  )];

  const results = await Promise.allSettled(
    uniqueSymbols.map(async (symbol) => {
      const snapshot = await takeSnapshot(symbol);
      const change = await detectMeaningfulChange(symbol);
      return { snapshot, change };
    }),
  );

  const successful = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({
        symbol: uniqueSymbols[index],
        message: result.reason.message,
      });
    }
  });

  return {
    requested: uniqueSymbols.length,
    succeeded: successful.length,
    failed: failed.length,
    failures: failed,
  };
}

module.exports = {
  takeSnapshot,
  collectSnapshotsForAllWatchedSymbols,
};
