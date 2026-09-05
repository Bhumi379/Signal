const axios = require('axios');
const StockSnapshot = require('../models/StockSnapshot');

const FINNHUB_URL = 'https://finnhub.io/api/v1/quote';
const FINNHUB_SEARCH_URL = 'https://finnhub.io/api/v1/search';
const FINNHUB_NEWS_URL = 'https://finnhub.io/api/v1/company-news';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RATE_LIMIT_RETRIES = 2;
const RETRY_DELAY_MS = 300;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchQuote(normalizedSymbol) {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    try {
      return await axios.get(FINNHUB_URL, {
        params: {
          symbol: normalizedSymbol,
          token: process.env.FINNHUB_API_KEY,
        },
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

async function fetchSearch(query) {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    try {
      return await axios.get(FINNHUB_SEARCH_URL, {
        params: {
          q: query,
          token: process.env.FINNHUB_API_KEY,
        },
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

async function getLatestSnapshot(normalizedSymbol) {
  return StockSnapshot.findOne({ symbol: normalizedSymbol })
    .sort({ timestamp: -1 })
    .select('price volume timestamp')
    .lean();
}

async function getStaleQuote(normalizedSymbol, originalError) {
  const snapshot = await getLatestSnapshot(normalizedSymbol);

  if (!snapshot) {
    const detail = originalError.response?.data?.error || originalError.code || originalError.message;
    throw new Error(`Unable to fetch quote for ${normalizedSymbol}, and no cached snapshot is available: ${detail}`);
  }

  return {
    currentPrice: snapshot.price,
    high: snapshot.price,
    low: snapshot.price,
    open: snapshot.price,
    previousClose: snapshot.price,
    change: null,
    percentChange: null,
    volume: snapshot.volume,
    stale: true,
    lastUpdated: snapshot.timestamp,
  };
}

async function getQuote(symbol) {
  const normalizedSymbol = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';

  if (!normalizedSymbol) {
    throw new Error('A stock symbol is required');
  }

  try {
    if (!process.env.FINNHUB_API_KEY) {
      throw new Error('Finnhub API key is not configured');
    }

    const response = await fetchQuote(normalizedSymbol);

    const { c, h, l, o, pc, d, dp, v } = response.data;

    if (typeof c !== 'number' || typeof pc !== 'number') {
      throw new Error(`Finnhub returned no quote data for ${normalizedSymbol}`);
    }

    return {
      currentPrice: c,
      high: h,
      low: l,
      open: o,
      previousClose: pc,
      change: d,
      percentChange: dp,
      volume: v,
      stale: false,
      lastUpdated: new Date(),
    };
  } catch (err) {
    if (err.message.startsWith('Finnhub returned')) {
      return getStaleQuote(normalizedSymbol, err);
    }

    return getStaleQuote(normalizedSymbol, err);
  }
}

async function searchSymbol(query) {
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';

  if (!normalizedQuery) return [];
  if (!process.env.FINNHUB_API_KEY) {
    throw new Error('Finnhub API key is not configured');
  }

  try {
    const response = await fetchSearch(normalizedQuery);
    return (response.data.result || [])
      .filter((result) => typeof result.symbol === 'string' && result.symbol.trim())
      .map((result) => ({
        symbol: result.symbol.trim().toUpperCase(),
        description: typeof result.description === 'string' ? result.description.trim() : '',
      }));
  } catch (err) {
    const detail = err.response?.data?.error || err.code || err.message;
    throw new Error(`Unable to search symbols: ${detail}`);
  }
}

async function getCompanyNews(symbol, fromDate, toDate) {
  const normalizedSymbol = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';
  if (!normalizedSymbol || !process.env.FINNHUB_API_KEY) return [];

  try {
    const response = await axios.get(FINNHUB_NEWS_URL, {
      params: {
        symbol: normalizedSymbol,
        from: fromDate,
        to: toDate,
        token: process.env.FINNHUB_API_KEY,
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

    return (Array.isArray(response.data) ? response.data : [])
      .filter((item) => item && item.headline && item.url)
      .sort((first, second) => second.datetime - first.datetime)
      .slice(0, 3)
      .map((item) => ({
        headline: item.headline,
        url: item.url,
        source: item.source || '',
        datetime: new Date(item.datetime * 1000),
      }));
  } catch {
    return [];
  }
}

module.exports = { getQuote, searchSymbol, getCompanyNews };
