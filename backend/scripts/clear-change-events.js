require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');
const ChangeEvent = require('../models/ChangeEvent');

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (mongoDnsServers.length > 0) {
  dns.setServers(mongoDnsServers);
}

if (!process.argv.includes('--confirm')) {
  console.error('Refusing to delete ChangeEvent documents without --confirm.');
  console.error('Run: node scripts/clear-change-events.js --confirm');
  process.exitCode = 1;
} else if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not configured.');
  process.exitCode = 1;
} else {
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      family: 4,
    })
    .then(async () => {
      const result = await ChangeEvent.deleteMany({});
      console.log(`Deleted ${result.deletedCount} ChangeEvent documents.`);
    })
    .catch((error) => {
      console.error(`Failed to clear ChangeEvent documents: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });
}
