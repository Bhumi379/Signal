const mongoose = require('mongoose');

const changeEventSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
  },
  changeType: {
    type: String,
    enum: ['price_spike', 'volume_spike', 'combined'],
    required: true,
  },
  magnitude: {
    type: Number,
  },
  reason: {
    type: String,
  },
  headlines: {
    type: [{
      headline: String,
      url: String,
      source: String,
      datetime: Date,
    }],
    default: [],
  },
  detectedAt: {
    type: Date,
    default: Date.now,
  },
  seenByUsers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
});

changeEventSchema.index({ symbol: 1, detectedAt: -1 });

module.exports = mongoose.model('ChangeEvent', changeEventSchema);
