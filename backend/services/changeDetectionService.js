const ChangeEvent = require('../models/ChangeEvent');
const StockSnapshot = require('../models/StockSnapshot');
const { getYahooQuote } = require('./yahooFinanceService');
const { getCompanyNews } = require('./finnhubService');

const MINIMUM_SAMPLE_SIZE = 5;
const SNAPSHOT_LIMIT = 30;
const DUPLICATE_EVENT_WINDOW_MS = 60 * 60 * 1000;

function normalizeSymbol(symbol) {
  return typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';
}

async function calculateStats(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    throw new Error('A stock symbol is required');
  }

  const snapshots = await StockSnapshot.find({ symbol: normalizedSymbol })
    .sort({ timestamp: -1 })
    .limit(SNAPSHOT_LIMIT)
    .select('price timestamp')
    .lean();

  const chronologicalSnapshots = snapshots.reverse();
  const changes = [];

  for (let index = 1; index < chronologicalSnapshots.length; index += 1) {
    const previousPrice = chronologicalSnapshots[index - 1].price;
    const currentPrice = chronologicalSnapshots[index].price;

    if (typeof previousPrice !== 'number' || typeof currentPrice !== 'number' || previousPrice === 0) {
      continue;
    }

    changes.push(((currentPrice - previousPrice) / previousPrice) * 100);
  }

  if (changes.length < MINIMUM_SAMPLE_SIZE) {
    return null;
  }

  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  const variance = changes.reduce(
    (sum, change) => sum + ((change - avgChange) ** 2),
    0,
  ) / changes.length;

  return {
    avgChange,
    stdDev: Math.sqrt(variance),
    sampleSize: changes.length,
  };
}

async function detectMeaningfulChange(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    throw new Error('A stock symbol is required');
  }

  const latestQuote = await getYahooQuote(normalizedSymbol);
  const stats = await calculateStats(normalizedSymbol);

  if (stats === null) {
    return {
      isMeaningful: false,
      reason: 'not enough history yet',
    };
  }

  const latestChange = latestQuote.percentChange;
  if (typeof latestChange !== 'number') {
    throw new Error(`Finnhub returned no percent change for ${normalizedSymbol}`);
  }

  const zScore = stats.stdDev === 0
    ? (latestChange === stats.avgChange ? 0 : Infinity * Math.sign(latestChange - stats.avgChange))
    : (latestChange - stats.avgChange) / stats.stdDev;
  const isMeaningful = Math.abs(zScore) > 2;

  if (!isMeaningful) {
    return { isMeaningful: false, zScore, reason: null };
  }

  const magnitude = Math.abs(zScore) > 3 ? 'high' : 'moderate';
  const direction = latestChange >= stats.avgChange ? 'more' : 'less';
  const reason = `This moved much ${direction} than its usual daily swing (${magnitude} change)`;
  const duplicateSince = new Date(Date.now() - DUPLICATE_EVENT_WINDOW_MS);
  const recentEvent = await ChangeEvent.findOne({
    symbol: normalizedSymbol,
    changeType: 'price_spike',
    detectedAt: { $gte: duplicateSince },
  });

  if (!recentEvent) {
    const event = await ChangeEvent.create({
      symbol: normalizedSymbol,
      changeType: 'price_spike',
      magnitude: zScore,
      reason,
      detectedAt: new Date(),
    });

    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 2);
    const formatDate = (date) => date.toISOString().slice(0, 10);

    try {
      const headlines = await getCompanyNews(
        normalizedSymbol,
        formatDate(from),
        formatDate(today),
      );
      if (headlines.length) {
        await ChangeEvent.findByIdAndUpdate(event._id, { headlines });
      }
    } catch {
      // News is optional enrichment; the meaningful-change event remains valid.
    }
  }

  return { isMeaningful: true, zScore, reason };
}

module.exports = {
  calculateStats,
  detectMeaningfulChange,
};
