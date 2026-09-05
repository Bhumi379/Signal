/*
 * Demo-only snapshot seeder. Run from the backend directory:
 *   node scripts/seedDemoData.js
 *
 * Edit watchlistSymbols and flaggedSymbols before recording a demo.
 * This inserts data; it deliberately does not remove existing snapshots.
 */
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const StockSnapshot = require('../models/StockSnapshot');
const { detectMeaningfulChange } = require('../services/changeDetectionService');

// EDIT: the symbols currently in the watchlist you want to demonstrate.
const watchlistSymbols = [
  'HDFCBANK.NS',
  'ICICIBANK.NS',
  'HINDUNILVR.NS',
  'AMZN',
  'RELIANCE.NS',
];

// EDIT: exactly two symbols from watchlistSymbols that should look unusual.
const flaggedSymbols = ['ICICIBANK.NS', 'HDFCBANK.NS'];

const SNAPSHOT_COUNT = 18;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// Keep demo runs deterministic. Set false only when you intentionally want
// to append this generated history to snapshots already stored for a symbol.
const RESET_EXISTING_HISTORY = true;

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (mongoDnsServers.length > 0) {
  dns.setServers(mongoDnsServers);
}

function normalizeSymbol(symbol) {
  return typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';
}

function estimatedStartingPrice(symbol) {
  // A stable, plausible starting value when no live quote is needed for a demo.
  return [...symbol].reduce((total, character) => total + character.charCodeAt(0), 0) + 350;
}

function normalMovePercent() {
  const magnitude = 0.3 + Math.random() * 0.5; // 0.3% through 0.8%
  return Math.random() < 0.5 ? -magnitude : magnitude;
}

function outlierMovePercent(symbol) {
  const magnitude = 4 + Math.random() * 2; // 4% through 6%
  // One can rise and one can fall, making the demo easier to read at a glance.
  return flaggedSymbols.indexOf(symbol) % 2 === 0 ? magnitude : -magnitude;
}

function buildSnapshots(symbol) {
  const now = Date.now();
  let price = estimatedStartingPrice(symbol);
  const isFlagged = flaggedSymbols.includes(symbol);
  const snapshots = [];

  for (let index = 0; index < SNAPSHOT_COUNT; index += 1) {
    const isMostRecent = index === SNAPSHOT_COUNT - 1;
    const move = isMostRecent && isFlagged ? outlierMovePercent(symbol) : normalMovePercent();
    price *= 1 + (move / 100);
    snapshots.push({
      symbol,
      price: Math.round(price * 100) / 100,
      volume: Math.round(150000 + Math.random() * 850000),
      timestamp: new Date(now - ((SNAPSHOT_COUNT - 1 - index) * FIVE_MINUTES_MS)),
    });
  }

  return snapshots;
}

async function seedDemoData() {
  const symbols = [...new Set(watchlistSymbols.map(normalizeSymbol).filter(Boolean))];
  const normalizedFlaggedSymbols = flaggedSymbols.map(normalizeSymbol).filter(Boolean);

  if (normalizedFlaggedSymbols.length !== 2 || new Set(normalizedFlaggedSymbols).size !== 2) {
    throw new Error('flaggedSymbols must contain exactly two distinct symbols.');
  }
  if (normalizedFlaggedSymbols.some((symbol) => !symbols.includes(symbol))) {
    throw new Error('Every flagged symbol must also appear in watchlistSymbols.');
  }

  // Keep the editable values normalized for helpers that create the final jump.
  flaggedSymbols.splice(0, flaggedSymbols.length, ...normalizedFlaggedSymbols);

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000, family: 4 });
  try {
    if (RESET_EXISTING_HISTORY) {
      const { deletedCount } = await StockSnapshot.deleteMany({ symbol: { $in: symbols } });
      console.log(`Cleared ${deletedCount} existing snapshots for the demo symbols.`);
    }

    for (const symbol of symbols) {
      const snapshots = buildSnapshots(symbol);
      await StockSnapshot.insertMany(snapshots);
      const result = await detectMeaningfulChange(symbol);
      console.log(`${symbol}: ${result.isMeaningful ? 'FLAGGED' : 'normal'}${result.zScore != null ? ` (z=${result.zScore.toFixed(2)})` : ` (${result.reason})`}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoData()
  .then(() => console.log('Demo snapshots seeded.'))
  .catch((error) => {
    console.error('Unable to seed demo snapshots:', error.message);
    process.exitCode = 1;
  });
