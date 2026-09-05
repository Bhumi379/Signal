const ChangeEvent = require('../models/ChangeEvent');
const User = require('../models/User');
const WatchlistItem = require('../models/WatchlistItem');

async function getDigest(req, res) {
  try {
    const user = await User.findById(req.userId).select('lastSeenAt').lean();

    if (!user?.lastSeenAt) {
      return res.json({ firstVisit: true, items: [] });
    }

    const symbols = await WatchlistItem.find({ userId: req.userId }).distinct('symbol');
    const items = await ChangeEvent.find({
      detectedAt: { $gt: user.lastSeenAt },
      symbol: { $in: symbols },
      seenByUsers: { $ne: req.userId },
    })
      .sort({ magnitude: -1, detectedAt: -1 })
      .limit(10)
      .select('symbol magnitude reason detectedAt changeType headlines')
      .lean();

    res.json({ firstVisit: false, items });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching digest' });
  }
}

async function markDigestSeen(req, res) {
  try {
    const user = await User.findById(req.userId).select('lastSeenAt').lean();
    const now = new Date();

    if (user?.lastSeenAt) {
      const symbols = await WatchlistItem.find({ userId: req.userId }).distinct('symbol');
      await ChangeEvent.updateMany(
        {
          detectedAt: { $gt: user.lastSeenAt, $lte: now },
          symbol: { $in: symbols },
          seenByUsers: { $ne: req.userId },
        },
        { $addToSet: { seenByUsers: req.userId } },
      );
    }

    await User.findByIdAndUpdate(req.userId, { lastSeenAt: now });
    res.json({ lastSeenAt: now });
  } catch (err) {
    res.status(500).json({ message: 'Server error marking digest as seen' });
  }
}

module.exports = { getDigest, markDigestSeen };