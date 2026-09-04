const mongoose = require('mongoose');

const stockSnapshotSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true,
  },
  price: {
    type: Number,
    required: true,
  },
  volume: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

stockSnapshotSchema.index({ symbol: 1, timestamp: -1 });

module.exports = mongoose.model('StockSnapshot', stockSnapshotSchema);
