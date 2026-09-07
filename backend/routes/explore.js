const express = require('express');
const axios = require('axios');
const curatedStocks = require('../data/curatedStocks');

const router = express.Router();

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 mins cache
const BATCH_SIZE = 25; // Concurrent fetching for speed
const BATCH_DELAY_MS = 200;

let cachedResponse = null;
let cachedAt = 0;
let pendingFetch = null;

// Helper: Fetch real live chart data and quote from Yahoo Finance
async function fetchRealYahooData(symbol) {
  try {
    // Yahoo Chart API provides both current quote AND real historical sparkline points
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      timeout: 4000,
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const closePrices = result.indicators?.quote?.[0]?.close || [];

    // Filter valid numerical prices for real trend graph
    const validTrendPoints = closePrices
      .filter((price) => typeof price === 'number' && !isNaN(price))
      .map((price) => Number(price.toFixed(2)));

    const currentPrice = meta.regularMarketPrice || (validTrendPoints.length > 0 ? validTrendPoints[validTrendPoints.length - 1] : null);
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;

    let percentChange = 0;
    if (currentPrice && previousClose) {
      percentChange = Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2));
    }

    return {
      quote: {
        currentPrice: currentPrice ? Number(currentPrice.toFixed(2)) : null,
        percentChange: percentChange,
        volume: meta.regularMarketVolume || 0,
      },
      // Real historic price points directly from Yahoo chart history
      trend: validTrendPoints.length > 0 ? validTrendPoints : (currentPrice ? [currentPrice] : []),
      meaningfulChange: {
        isMeaningful: Math.abs(percentChange) >= 2.5, // Flags unusual moves (> 2.5%)
      },
    };
  } catch (err) {
    return null;
  }
}

// Optimized Parallel Real Fetcher
async function fetchAllRealStocks() {
  console.info(`[explore] Fetching 100% REAL market data for ${curatedStocks.length} symbols...`);
  const finalResults = [];

  for (let i = 0; i < curatedStocks.length; i += BATCH_SIZE) {
    const batch = curatedStocks.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (stock) => {
      const realData = await fetchRealYahooData(stock.symbol);
      
      if (realData && realData.quote.currentPrice !== null) {
        return {
          ...stock,
          quote: realData.quote,
          trend: realData.trend,
          meaningfulChange: realData.meaningfulChange,
        };
      }
      return null;
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value) {
        finalResults.push(res.value);
      }
    });

    if (i + BATCH_SIZE < curatedStocks.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return finalResults;
}

router.get('/', async (req, res) => {
  try {
    // 1. Serve fresh cache instantly if available (< 2 mins old)
    if (cachedResponse && Date.now() - cachedAt < CACHE_TTL_MS) {
      return res.json(cachedResponse);
    }

    // 2. Fetch fresh real data if cache expired or null
    if (!pendingFetch) {
      pendingFetch = fetchAllRealStocks()
        .then((data) => {
          if (data.length > 0) {
            cachedResponse = data;
            cachedAt = Date.now();
          }
          return cachedResponse || data;
        })
        .finally(() => {
          pendingFetch = null;
        });
    }

    const realData = await pendingFetch;
    return res.json(realData || []);

  } catch (error) {
    console.error('[explore-route] Error fetching live data:', error.message);
    return res.status(500).json({ message: 'Error loading real stock data' });
  }
});

module.exports = router;