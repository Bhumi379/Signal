const StockSnapshot = require('../models/StockSnapshot');
const WatchlistItem = require('../models/WatchlistItem');
const curatedStocks = require('../data/curatedStocks');
const { getYahooQuote } = require('./yahooFinanceService');
const { detectMeaningfulChange } = require('./changeDetectionService');

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 10 * 1000;

async function takeSnapshot(symbol) {
  const normalizedSymbol = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';

  if (!normalizedSymbol) {
    throw new Error('A stock symbol is required to take a snapshot');
  }

  const quote = await getYahooQuote(normalizedSymbol);
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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getAllTrackedSymbols() {
  const watchlistSymbols = await WatchlistItem.distinct('symbol');
  const curatedSymbols = curatedStocks.map((stock) => stock.symbol);

  const combined = [...watchlistSymbols, ...curatedSymbols]
    .filter((symbol) => typeof symbol === 'string' && symbol.trim())
    .map((symbol) => symbol.trim().toUpperCase());

  return [...new Set(combined)];
}

async function collectSnapshotsForAllWatchedSymbols() {
  const startedAt = Date.now();
  const uniqueSymbols = await getAllTrackedSymbols();

  const successful = [];
  const failed = [];

  for (let start = 0; start < uniqueSymbols.length; start += BATCH_SIZE) {
    const batch = uniqueSymbols.slice(start, start + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (symbol) => {
        const snapshot = await takeSnapshot(symbol);
        const change = await detectMeaningfulChange(symbol);
        return { symbol, snapshot, change };
      }),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          symbol: batch[index],
          message: result.reason.message,
        });
      }
    });

    if (start + BATCH_SIZE < uniqueSymbols.length) {
      await wait(BATCH_DELAY_MS);
    }
  }

  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.info(
    `[snapshot-collection] requested=${uniqueSymbols.length} succeeded=${successful.length} failed=${failed.length} durationSeconds=${durationSeconds}`,
  );
  if (failed.length > 0) {
    console.info('[snapshot-collection] failures:', failed);
  }

  return {
    requested: uniqueSymbols.length,
    succeeded: successful.length,
    failed: failed.length,
    failures: failed,
    durationSeconds: Number(durationSeconds),
  };
}

module.exports = {
  takeSnapshot,
  collectSnapshotsForAllWatchedSymbols,
};