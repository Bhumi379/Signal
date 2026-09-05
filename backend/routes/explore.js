const express = require('express');
const ChangeEvent = require('../models/ChangeEvent');
const StockSnapshot = require('../models/StockSnapshot');
const { getYahooQuote } = require('../services/yahooFinanceService');

const router = express.Router();
const CACHE_TTL_MS = 60 * 1000;
const QUOTE_BATCH_SIZE = 10;
const QUOTE_BATCH_DELAY_MS = 10 * 1000;
let cachedResponse = null;
let cachedAt = 0;
let pendingLoad = null;

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
  { symbol: 'LTIM.NS', companyName: 'LTIMindtree', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'PERSISTENT.NS', companyName: 'Persistent Systems', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'MPHASIS.NS', companyName: 'Mphasis', sector: 'IT', capTier: 'Mid Cap' },
  { symbol: 'COFORGE.NS', companyName: 'Coforge', sector: 'IT', capTier: 'Large Cap' },
  { symbol: 'INDUSINDBK.NS', companyName: 'IndusInd Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'BAJAJFINSV.NS', companyName: 'Bajaj Finserv', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'BANDHANBNK.NS', companyName: 'Bandhan Bank', sector: 'Banking & Finance', capTier: 'Mid Cap' },
  { symbol: 'IDFCFIRSTB.NS', companyName: 'IDFC First Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'FEDERALBNK.NS', companyName: 'Federal Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'CHOLAFIN.NS', companyName: 'Cholamandalam Investment and Finance', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'MUTHOOTFIN.NS', companyName: 'Muthoot Finance', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'LICHSGFIN.NS', companyName: 'LIC Housing Finance', sector: 'Banking & Finance', capTier: 'Mid Cap' },
  { symbol: 'CANBK.NS', companyName: 'Canara Bank', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'UNIONBANK.NS', companyName: 'Union Bank of India', sector: 'Banking & Finance', capTier: 'Large Cap' },
  { symbol: 'ADANIGREEN.NS', companyName: 'Adani Green Energy', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'TATAPOWER.NS', companyName: 'Tata Power', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'BPCL.NS', companyName: 'Bharat Petroleum', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'IOC.NS', companyName: 'Indian Oil Corporation', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'GAIL.NS', companyName: 'GAIL (India)', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'PETRONET.NS', companyName: 'Petronet LNG', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'OIL.NS', companyName: 'Oil India', sector: 'Energy', capTier: 'Large Cap' },
  { symbol: 'DABUR.NS', companyName: 'Dabur India', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'MARICO.NS', companyName: 'Marico', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'GODREJCP.NS', companyName: 'Godrej Consumer Products', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'COLPAL.NS', companyName: 'Colgate-Palmolive (India)', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'TATACONSUM.NS', companyName: 'Tata Consumer Products', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'EMAMILTD.NS', companyName: 'Emami', sector: 'FMCG', capTier: 'Mid Cap' },
  { symbol: 'UBL.NS', companyName: 'United Breweries', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'RADICO.NS', companyName: 'Radico Khaitan', sector: 'FMCG', capTier: 'Mid Cap' },
  { symbol: 'VBL.NS', companyName: 'Varun Beverages', sector: 'FMCG', capTier: 'Large Cap' },
  { symbol: 'LUPIN.NS', companyName: 'Lupin', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'AUROPHARMA.NS', companyName: 'Aurobindo Pharma', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'BIOCON.NS', companyName: 'Biocon', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'ALKEM.NS', companyName: 'Alkem Laboratories', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'TORNTPHARM.NS', companyName: 'Torrent Pharmaceuticals', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'GLENMARK.NS', companyName: 'Glenmark Pharmaceuticals', sector: 'Pharma', capTier: 'Mid Cap' },
  { symbol: 'IPCALAB.NS', companyName: 'IPCA Laboratories', sector: 'Pharma', capTier: 'Mid Cap' },
  { symbol: 'LAURUSLABS.NS', companyName: 'Laurus Labs', sector: 'Pharma', capTier: 'Mid Cap' },
  { symbol: 'ZYDUSLIFE.NS', companyName: 'Zydus Lifesciences', sector: 'Pharma', capTier: 'Large Cap' },
  { symbol: 'TVSMOTOR.NS', companyName: 'TVS Motor Company', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'ASHOKLEY.NS', companyName: 'Ashok Leyland', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'BOSCHLTD.NS', companyName: 'Bosch', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'MOTHERSON.NS', companyName: 'Samvardhana Motherson International', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'EXIDEIND.NS', companyName: 'Exide Industries', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'BHARATFORG.NS', companyName: 'Bharat Forge', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'ESCORTS.NS', companyName: 'Escorts Kubota', sector: 'Auto', capTier: 'Large Cap' },
  { symbol: 'HINDALCO.NS', companyName: 'Hindalco Industries', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'VEDL.NS', companyName: 'Vedanta', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'SAIL.NS', companyName: 'Steel Authority of India', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'NMDC.NS', companyName: 'NMDC', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'JINDALSTEL.NS', companyName: 'Jindal Steel', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'NATIONALUM.NS', companyName: 'National Aluminium Company', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'HINDZINC.NS', companyName: 'Hindustan Zinc', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'APLAPOLLO.NS', companyName: 'APL Apollo Tubes', sector: 'Metals', capTier: 'Large Cap' },
  { symbol: 'RATNAMANI.NS', companyName: 'Ratnamani Metals & Tubes', sector: 'Metals', capTier: 'Mid Cap' },
  { symbol: 'IDEA.NS', companyName: 'Vodafone Idea', sector: 'Telecom', capTier: 'Large Cap' },
  { symbol: 'INDUSTOWER.NS', companyName: 'Indus Towers', sector: 'Telecom', capTier: 'Large Cap' },
  { symbol: 'HFCL.NS', companyName: 'HFCL', sector: 'Telecom', capTier: 'Mid Cap' },
  { symbol: 'TEJASNET.NS', companyName: 'Tejas Networks', sector: 'Telecom', capTier: 'Mid Cap' },
  { symbol: 'STLTECH.NS', companyName: 'Sterlite Technologies', sector: 'Telecom', capTier: 'Mid Cap' },
];

async function loadExploreStock({ symbol, companyName, sector, capTier }) {
    try {
      const [quote, event, snapshots] = await Promise.all([
        getYahooQuote(symbol),
        ChangeEvent.findOne({
          symbol,
          changeType: 'price_spike',
          detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        })
          .sort({ detectedAt: -1 })
          .select('reason detectedAt')
          .lean(),
        StockSnapshot.find({ symbol })
          .sort({ timestamp: -1 })
          .limit(20)
          .select('price timestamp')
          .lean(),
      ]);

      return {
        symbol,
        companyName,
        sector,
        capTier,
        quote,
        trend: snapshots.reverse().map((snapshot) => ({
          value: snapshot.price,
          timestamp: snapshot.timestamp,
        })),
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
        trend: [],
        meaningfulChange: { isMeaningful: false, reason: null },
        error: 'Quote unavailable',
      };
    }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loadExploreData() {
  const results = [];

  for (let start = 0; start < curatedStocks.length; start += QUOTE_BATCH_SIZE) {
    const batch = curatedStocks.slice(start, start + QUOTE_BATCH_SIZE);
    results.push(...await Promise.all(batch.map(loadExploreStock)));

    if (start + QUOTE_BATCH_SIZE < curatedStocks.length) {
      await wait(QUOTE_BATCH_DELAY_MS);
    }
  }

  return results;
}

router.get('/', async (req, res) => {
  try {
    if (cachedResponse && Date.now() - cachedAt < CACHE_TTL_MS) {
      console.info('[explore-cache] hit');
      return res.json(cachedResponse);
    }

    if (!pendingLoad) {
      console.info(`[explore-cache] miss; refreshing ${curatedStocks.length} symbols in batches of ${QUOTE_BATCH_SIZE}`);
      pendingLoad = loadExploreData()
        .then((response) => {
          cachedResponse = response;
          cachedAt = Date.now();
          return response;
        })
        .finally(() => {
          pendingLoad = null;
        });
    } else {
      console.info('[explore-cache] refresh already in progress');
    }

    return res.json(await pendingLoad);
  } catch (error) {
    return res.status(502).json({ message: 'Unable to load explore data' });
  }
});

module.exports = router;
