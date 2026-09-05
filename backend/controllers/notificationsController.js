const mongoose = require('mongoose');
const ChangeEvent = require('../models/ChangeEvent');
const WatchlistItem = require('../models/WatchlistItem');

async function getNotifications(req, res) {
  try {
    const symbols = await WatchlistItem.find({ userId: req.userId }).distinct('symbol');
    const events = await ChangeEvent.find({ symbol: { $in: symbols } })
      .sort({ detectedAt: -1 })
      .limit(30)
      .select('symbol changeType magnitude reason headlines detectedAt seenByUsers')
      .lean();

    res.json(events.map((event) => ({
      eventId: event._id,
      symbol: event.symbol,
      changeType: event.changeType,
      magnitude: event.magnitude,
      reason: event.reason,
      headlines: event.headlines || [],
      detectedAt: event.detectedAt,
      isUnread: !event.seenByUsers.some((userId) => userId.toString() === req.userId.toString()),
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
}

async function markNotificationRead(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const symbols = await WatchlistItem.find({ userId: req.userId }).distinct('symbol');
    const event = await ChangeEvent.findOneAndUpdate(
      { _id: req.params.eventId, symbol: { $in: symbols } },
      { $addToSet: { seenByUsers: req.userId } },
      { new: true },
    )
      .select('symbol changeType magnitude reason headlines detectedAt seenByUsers')
      .lean();

    if (!event) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      eventId: event._id,
      symbol: event.symbol,
      changeType: event.changeType,
      magnitude: event.magnitude,
      reason: event.reason,
      headlines: event.headlines || [],
      detectedAt: event.detectedAt,
      isUnread: false,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
}

module.exports = { getNotifications, markNotificationRead };
