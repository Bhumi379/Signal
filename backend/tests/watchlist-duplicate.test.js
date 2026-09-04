const test = require('node:test');
const assert = require('node:assert/strict');
const dns = require('dns');
const mongoose = require('mongoose');
const WatchlistItem = require('../models/WatchlistItem');

require('dotenv').config();

if (process.env.MONGO_DNS_SERVERS) {
  dns.setServers(process.env.MONGO_DNS_SERVERS.split(',').map((server) => server.trim()));
}

test('concurrent watchlist inserts keep one symbol per user', { skip: !process.env.MONGO_URI }, async () => {
  const userId = new mongoose.Types.ObjectId();
  const symbol = `TEST_${new mongoose.Types.ObjectId().toString().slice(-8)}`;

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    family: 4,
  });

  try {
    await WatchlistItem.init();
    const results = await Promise.allSettled([
      WatchlistItem.create({ userId, symbol }),
      WatchlistItem.create({ userId, symbol }),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.code, 11000);
    assert.equal(await WatchlistItem.countDocuments({ userId, symbol }), 1);
  } finally {
    await WatchlistItem.deleteMany({ userId, symbol });
    await mongoose.disconnect();
  }
});
