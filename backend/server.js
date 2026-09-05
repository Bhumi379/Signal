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

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://signalgroww.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/digest', require('./routes/digest'));
app.use('/api/explore', require('./routes/explore'));
app.use('/api/indices', require('./routes/indices'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/watchlist', require('./routes/watchlist'));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  console.error('Unhandled request error:', err.message);
  res.status(err.status || 500).json({
    message: err.status ? err.message : 'Something went wrong',
  });
});

app.listen(PORT);

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    family: 4,
  })
  .then(() => undefined)
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error('API is still running. Auth and watchlist routes need MongoDB.');
  });

cron.schedule('*/5 * * * *', async () => {
  try {
    await collectSnapshotsForAllWatchedSymbols();
  } catch (err) {
    console.error('Scheduled snapshot collection failed:', err.message);
  }
});
