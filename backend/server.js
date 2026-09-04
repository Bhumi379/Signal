require('dotenv').config();
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const {
  collectSnapshotsForAllWatchedSymbols,
} = require('./services/snapshotService');

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (mongoDnsServers.length > 0) {
  dns.setServers(mongoDnsServers);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.post('/api/admin/snapshot-now', async (req, res) => {
  try {
    const result = await collectSnapshotsForAllWatchedSymbols();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Snapshot collection failed', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    family: 4,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error('API is still running. Auth and watchlist routes need MongoDB.');
  });

cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await collectSnapshotsForAllWatchedSymbols();
    console.log('Scheduled snapshot collection complete:', result);
  } catch (err) {
    console.error('Scheduled snapshot collection failed:', err.message);
  }
});
