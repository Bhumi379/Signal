const ChangeEvent = require('../models/ChangeEvent');
const StockSnapshot = require('../models/StockSnapshot');
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
  const historicalSnapshots = chronologicalSnapshots.slice(0, -1);
  const changes = [];

  // Keep the newest move out of the baseline so it is the observation
  // being tested, rather than diluting its own z-score.
  for (let index = 1; index < historicalSnapshots.length; index += 1) {
    const previousPrice = chronologicalSnapshots[index - 1].price;
    const currentPrice = chronologicalSnapshots[index].price;

    if (typeof previousPrice !== 'number' || typeof currentPrice !== 'number' || previousPrice === 0) {
      continue;
    }

    changes.push(((currentPrice - previousPrice) / previousPrice) * 100);
  }

  if (historicalSnapshots.length < MINIMUM_SAMPLE_SIZE || changes.length < MINIMUM_SAMPLE_SIZE) {
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

function latestSnapshotChange(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) return null;
  const previousPrice = snapshots[snapshots.length - 2]?.price;
  const currentPrice = snapshots[snapshots.length - 1]?.price;
  if (typeof previousPrice !== 'number' || typeof currentPrice !== 'number' || previousPrice === 0) return null;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

async function detectMeaningfulChange(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    throw new Error('A stock symbol is required');
  }

  const stats = await calculateStats(normalizedSymbol);
  const latestSnapshots = stats === null ? [] : await StockSnapshot.find({ symbol: normalizedSymbol })
    .sort({ timestamp: -1 })
    .limit(2)
    .select('price timestamp')
    .lean();
  const latestChange = latestSnapshotChange(latestSnapshots.reverse());
  const zScore = stats && typeof latestChange === 'number' && stats.stdDev >= 0.15
    ? (latestChange - stats.avgChange) / stats.stdDev
    : null;

  if (stats === null) {
    return {
      isMeaningful: false,
      reason: 'not enough history yet',
    };
  }

  if (typeof latestChange !== 'number') {
    return { isMeaningful: false, reason: 'quote change unavailable' };
  }

  if (stats.stdDev < 0.15) {
    return { isMeaningful: false, zScore: null, reason: 'not enough variation yet' };
  }

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
