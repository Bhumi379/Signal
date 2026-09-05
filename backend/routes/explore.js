const express = require('express');
const ChangeEvent = require('../models/ChangeEvent');
const { getYahooQuote } = require('../services/yahooFinanceService');

const router = express.Router();
const CACHE_TTL_MS = 60 * 1000;
let cachedResponse = null;
let cachedAt = 0;

const curatedStocks = [
  { symbol: 'RELIANCE.NS', companyName: 'Reliance Industries', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'TCS.NS', companyName: 'Tata Consultancy Services', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'HDFCBANK.NS', companyName: 'HDFC Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'INFY.NS', companyName: 'Infosys', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'ITC.NS', companyName: 'ITC', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'TATASTEEL.NS', companyName: 'Tata Steel', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'ICICIBANK.NS', companyName: 'ICICI Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'SBIN.NS', companyName: 'State Bank of India', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'BHARTIARTL.NS', companyName: 'Bharti Airtel', sector: 'Telecom', capTier: 'Large Cap' },
  { symbol: 'HINDUNILVR.NS', companyName: 'Hindustan Unilever', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'LT.NS', companyName: 'Larsen & Toubro', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'KOTAKBANK.NS', companyName: 'Kotak Mahindra Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'AXISBANK.NS', companyName: 'Axis Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'BAJFINANCE.NS', companyName: 'Bajaj Finance', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'MARUTI.NS', companyName: 'Maruti Suzuki India', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'SUNPHARMA.NS', companyName: 'Sun Pharmaceutical', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'TITAN.NS', companyName: 'Titan Company', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'ASIANPAINT.NS', companyName: 'Asian Paints', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'ULTRACEMCO.NS', companyName: 'UltraTech Cement', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'WIPRO.NS', companyName: 'Wipro', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'HCLTECH.NS', companyName: 'HCL Technologies', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'ADANIENT.NS', companyName: 'Adani Enterprises', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'ADANIPORTS.NS', companyName: 'Adani Ports', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'POWERGRID.NS', companyName: 'Power Grid Corporation', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'NTPC.NS', companyName: 'NTPC', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'COALINDIA.NS', companyName: 'Coal India', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'ONGC.NS', companyName: 'Oil & Natural Gas Corporation', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'TATAMOTORS.NS', companyName: 'Tata Motors', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'M&M.NS', companyName: 'Mahindra & Mahindra', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'BAJAJ-AUTO.NS', companyName: 'Bajaj Auto', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'HEROMOTOCO.NS', companyName: 'Hero MotoCorp', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'NESTLEIND.NS', companyName: 'Nestle India', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'BRITANNIA.NS', companyName: 'Britannia Industries', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'CIPLA.NS', companyName: 'Cipla', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'DRREDDY.NS', companyName: 'Dr. Reddy’s Laboratories', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'DIVISLAB.NS', companyName: 'Divi’s Laboratories', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'TECHM.NS', companyName: 'Tech Mahindra', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'EICHERMOT.NS', companyName: 'Eicher Motors', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'JSWSTEEL.NS', companyName: 'JSW Steel', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'GRASIM.NS', companyName: 'Grasim Industries', sector: 'Metals', capTier: 'Large Cap' },
];

async function loadExploreData() {
  const results = await Promise.all(curatedStocks.map(async ({ symbol, companyName, sector, capTier }) => {
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
        sector,
        capTier,
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
        sector,
        capTier,
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
