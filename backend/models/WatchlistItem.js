const mongoose = require('mongoose');

const watchlistItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

watchlistItemSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model('WatchlistItem', watchlistItemSchema);
