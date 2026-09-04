const axios = require('axios');

const FINNHUB_URL = 'https://finnhub.io/api/v1/quote';
const REQUEST_TIMEOUT_MS = 8000;

async function getQuote(symbol) {
  const normalizedSymbol = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';

  if (!normalizedSymbol) {
    throw new Error('A stock symbol is required');
  }

  if (!process.env.FINNHUB_API_KEY) {
    throw new Error('Finnhub API key is not configured');
  }

  try {
    const response = await axios.get(FINNHUB_URL, {
      params: {
        symbol: normalizedSymbol,
        token: process.env.FINNHUB_API_KEY,
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const { c, h, l, o, pc, d, dp } = response.data;

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
    };
  } catch (err) {
    if (err.message.startsWith('Finnhub returned')) {
      throw err;
    }

    const detail = err.response?.data?.error || err.code || err.message;
    throw new Error(`Unable to fetch quote for ${normalizedSymbol}: ${detail}`);
  }
}

module.exports = { getQuote };
