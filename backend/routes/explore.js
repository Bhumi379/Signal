const express = require('express');
const ChangeEvent = require('../models/ChangeEvent');
const { getYahooQuote } = require('../services/yahooFinanceService');

const router = express.Router();
const CACHE_TTL_MS = 60 * 1000;
let cachedResponse = null;
let cachedAt = 0;

const curatedStocks = [
  ['RELIANCE.NS', 'Reliance Industries'],
  ['TCS.NS', 'Tata Consultancy Services'],
  ['HDFCBANK.NS', 'HDFC Bank'],
  ['INFY.NS', 'Infosys'],
  ['ITC.NS', 'ITC'],
  ['TATASTEEL.NS', 'Tata Steel'],
  ['ICICIBANK.NS', 'ICICI Bank'],
  ['SBIN.NS', 'State Bank of India'],
  ['BHARTIARTL.NS', 'Bharti Airtel'],
  ['HINDUNILVR.NS', 'Hindustan Unilever'],
  ['LT.NS', 'Larsen & Toubro'],
  ['KOTAKBANK.NS', 'Kotak Mahindra Bank'],
  ['AXISBANK.NS', 'Axis Bank'],
  ['BAJFINANCE.NS', 'Bajaj Finance'],
  ['MARUTI.NS', 'Maruti Suzuki India'],
  ['SUNPHARMA.NS', 'Sun Pharmaceutical'],
  ['TITAN.NS', 'Titan Company'],
  ['ASIANPAINT.NS', 'Asian Paints'],
  ['ULTRACEMCO.NS', 'UltraTech Cement'],
  ['WIPRO.NS', 'Wipro'],
  ['HCLTECH.NS', 'HCL Technologies'],
  ['ADANIENT.NS', 'Adani Enterprises'],
  ['ADANIPORTS.NS', 'Adani Ports'],
  ['POWERGRID.NS', 'Power Grid Corporation'],
  ['NTPC.NS', 'NTPC'],
  ['COALINDIA.NS', 'Coal India'],
  ['ONGC.NS', 'Oil & Natural Gas Corporation'],
  ['TATAMOTORS.NS', 'Tata Motors'],
  ['M&M.NS', 'Mahindra & Mahindra'],
  ['BAJAJ-AUTO.NS', 'Bajaj Auto'],
  ['HEROMOTOCO.NS', 'Hero MotoCorp'],
  ['NESTLEIND.NS', 'Nestle India'],
  ['BRITANNIA.NS', 'Britannia Industries'],
  ['CIPLA.NS', 'Cipla'],
  ['DRREDDY.NS', 'Dr. Reddy’s Laboratories'],
  ['DIVISLAB.NS', 'Divi’s Laboratories'],
  ['TECHM.NS', 'Tech Mahindra'],
  ['EICHERMOT.NS', 'Eicher Motors'],
  ['JSWSTEEL.NS', 'JSW Steel'],
  ['GRASIM.NS', 'Grasim Industries'],
];

async function loadExploreData() {
  const results = await Promise.all(curatedStocks.map(async ([symbol, companyName]) => {
    try {
      const quote = await getYahooQuote(symbol);
      const event = await ChangeEvent.findOne({
        symbol,
        changeType: 'price_spike',
        detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
        .sort({ detectedAt: -1 })
        .select('reason detectedAt')
        .lean();

      return {
        symbol,
        companyName,
        quote,
        meaningfulChange: {
          isMeaningful: Boolean(event),
          reason: event?.reason || null,
        },
      };
    } catch (error) {
      return {
        symbol,
        companyName,
        quote: null,
        meaningfulChange: { isMeaningful: false, reason: null },
        error: 'Quote unavailable',
      };
    }
  }));

  return results;
}

router.get('/', async (req, res) => {
  try {
    if (cachedResponse && Date.now() - cachedAt < CACHE_TTL_MS) {
      return res.json(cachedResponse);
    }

    cachedResponse = await loadExploreData();
    cachedAt = Date.now();
    return res.json(cachedResponse);
  } catch (error) {
    return res.status(502).json({ message: 'Unable to load explore data' });
  }
});

module.exports = router;
