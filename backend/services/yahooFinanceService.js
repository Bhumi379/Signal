const axios = require('axios');
const StockSnapshot = require('../models/StockSnapshot');

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RATE_LIMIT_RETRIES = 2;
const RETRY_DELAY_MS = 300;
const USER_AGENT = 'Mozilla/5.0';
const MAJOR_US_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V',
]);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestWithRetry(url, params) {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    try {
      return await axios.get(url, {
        params,
        headers: { 'User-Agent': USER_AGENT },
        timeout: REQUEST_TIMEOUT_MS,
      });
    } catch (err) {
      const isRateLimited = err.response?.status === 429;
      const canRetry = isRateLimited && attempt < MAX_RATE_LIMIT_RETRIES;

      if (!canRetry) throw err;
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

async function getLatestSnapshot(symbol) {
  return StockSnapshot.findOne({ symbol })
    .sort({ timestamp: -1 })
    .select('price volume timestamp')
    .lean();
}

async function getStaleQuote(symbol, originalError) {
  let snapshot;
  try {
    snapshot = await getLatestSnapshot(symbol);
  } catch (snapshotError) {
    throw new Error(`Unable to fetch Yahoo quote for ${symbol}, and cached data is unavailable: ${snapshotError.message}`);
  }

  if (!snapshot) {
    throw new Error(`Unable to fetch Yahoo quote for ${symbol}, and no cached snapshot is available: ${originalError.message}`);
  }

  return {
    currentPrice: snapshot.price,
    previousClose: snapshot.price,
    change: null,
    percentChange: null,
    volume: snapshot.volume,
    high52Week: null,
    low52Week: null,
    dayHigh: snapshot.price,
    dayLow: snapshot.price,
    stale: true,
    lastUpdated: snapshot.timestamp,
  };
}

async function getYahooQuote(symbol) {
  const normalizedSymbol = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';
  if (!normalizedSymbol) throw new Error('A stock symbol is required');

  try {
    const response = await requestWithRetry(
      `${YAHOO_CHART_URL}/${encodeURIComponent(normalizedSymbol)}`,
      { range: '5d', interval: '1d' },
    );
    const chart = response.data?.chart;
    if (chart?.error) {
      throw new Error(`Yahoo chart error for ${normalizedSymbol}: ${chart.error.description || chart.error.code}`);
    }

    const result = chart?.result?.[0];
    const meta = result?.meta;

    if (!meta || typeof meta.regularMarketPrice !== 'number') {
      throw new Error(`Yahoo returned no quote data for ${normalizedSymbol}`);
    }

    const previousClose = typeof meta.previousClose === 'number'
      ? meta.previousClose
      : meta.chartPreviousClose;
    if (typeof previousClose !== 'number' || previousClose === 0) {
      throw new Error(`Yahoo returned no previous close for ${normalizedSymbol}`);
    }

    const currentPrice = meta.regularMarketPrice;
    const change = currentPrice - previousClose;
    const volumeValues = result.indicators?.quote?.[0]?.volume || [];
    const volume = [...volumeValues].reverse().find((value) => typeof value === 'number');
    const quote = {
      currentPrice,
      previousClose,
      change,
      percentChange: (change / previousClose) * 100,
      volume,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      stale: false,
      lastUpdated: new Date(),
    };

    if (typeof meta.fiftyTwoWeekHigh === 'number') {
      quote.high52Week = meta.fiftyTwoWeekHigh;
    }
    if (typeof meta.fiftyTwoWeekLow === 'number') {
      quote.low52Week = meta.fiftyTwoWeekLow;
    }

    return quote;
  } catch (err) {
    return getStaleQuote(normalizedSymbol, err);
  }
}

async function searchYahooSymbol(query) {
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';
  if (!normalizedQuery) return [];

  try {
    const response = await requestWithRetry(YAHOO_SEARCH_URL, { q: normalizedQuery });
    return (response.data?.quotes || [])
      .filter((result) => {
        const symbol = typeof result.symbol === 'string' ? result.symbol.toUpperCase() : '';
        return symbol.endsWith('.NS') || symbol.endsWith('.BO') || MAJOR_US_SYMBOLS.has(symbol);
      })
      .filter((result) => typeof result.symbol === 'string' && result.symbol.trim())
      .map((result) => ({
        symbol: result.symbol.trim().toUpperCase(),
        description: (result.shortname || result.longname || result.symbol).trim(),
      }));
  } catch (err) {
    throw new Error(`Unable to search Yahoo symbols: ${err.message}`);
  }
}

module.exports = { getYahooQuote, searchYahooSymbol };
