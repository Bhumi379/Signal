# Signal — A Smart Market Watchlist

Built for CODE 2026 (Groww)

## The problem with most watchlists

Every stock platform — Groww included — shows you the same thing: a
symbol, a price, and a green or red percentage. That number is treated
identically whether it's completely normal for that stock or wildly
out of character for it. A 2% move means something very different for
a stable large-cap bank stock than it does for a volatile small-cap —
but most watchlists show both the same way.

**Signal's thesis:** a watchlist's job isn't to show you *what
changed* — it's to show you *what changed that actually matters*, and
to remember what you've already seen so you're never re-reading the
same information twice.

## What counts as a "meaningful" change

Instead of a flat threshold (e.g. "flag anything that moved more than
2%"), Signal compares each stock's current move against **its own
recent history**:

1. For each stock, Signal maintains a rolling history of price
   snapshots (collected periodically via a background job).
2. It calculates that stock's normal daily volatility — the average
   and standard deviation of its recent day-to-day % changes.
3. When a new snapshot comes in, Signal calculates a **z-score**: how
   many standard deviations away from *this stock's own normal* the
   latest move is.
4. If `|z-score| > 2`, the move is statistically unusual for that
   specific stock — regardless of whether it's a large or small
   percentage in absolute terms — and it's flagged, with a
   plain-English reason attached.

This means the same 2% move can be flagged for one stock and ignored
for another, which is the entire point: relevance is relative to the
stock, not a one-size-fits-all number.

A stock is only ever evaluated once it has enough real history (a
minimum sample size) — new stocks are never flagged based on
insufficient data.

## Features

- **Watchlist** — add/remove stocks via a company-name search
  (autocomplete), grouped into "Needs attention" (currently flagged)
  and "Watching" (everything else), sorted so what matters floats to
  the top.
- **Explore** — a browsable, filterable list of ~100 curated
  NSE-listed stocks across sectors and market-cap tiers, with quick
  filters for Gainers / Losers / Unusual only, and a search bar that
  reaches beyond the curated list to any real stock via live symbol
  search.
- **"Since you last checked" digest** — a summary banner on login of
  what changed since the user's last visit, so returning users never
  have to manually diff the market against their memory.
- **Notification panel** — a persistent, anytime-accessible feed of
  flagged changes (separate from the one-time login digest), with a
  toggle between "My Watchlist" and "All Market" scope, and best-effort
  news headlines attached to each flagged event for context on *why*
  something moved.
- **Beginner-friendly tooltips** — plain-language explanations next to
  terms like Volume, 1D Change, and 52-week range, because a "smart"
  watchlist is only useful if the person reading it understands the
  vocabulary in the first place.
- **Simulated index ticker** — a live-feeling NIFTY/SENSEX/sector
  index strip (see Data Sources below for why this is simulated, not
  live).

## Architecture

```
React (Vite) frontend
        │
        ▼
Express REST API ──── MongoDB (users, watchlists, price history,
        │                       flagged-change events)
        ▼
Background cron job → periodically snapshots prices for every
                       symbol currently being watched, then runs
                       z-score detection against each one
```

State (watchlist contents, last-seen timestamp, read/unread alerts)
lives entirely in MongoDB, not on-device — so a user's watchlist and
alert history are identical whether they log in from a phone or a
laptop.

## Data sources (and a real resilience story)

- **Live stock quotes (India, NSE-listed):** Yahoo Finance's
  `v8/finance/chart` endpoint. This wasn't the original plan —
  Finnhub's free tier (the initial choice) only serves real-time
  quotes for US-listed securities, and Twelve Data's free tier only
  offers "trial" access to Indian symbols. Yahoo Finance's endpoint is
  unofficial and undocumented, which is a real trade-off: partway
  through building this, Yahoo's `v7/finance/quote` endpoint (an
  earlier version we'd integrated) started requiring authentication
  and returned 401 errors with no warning. The app didn't fully break
  because of the stale-data fallback described below — this was a live
  demonstration of exactly the "unreliable dependency" scenario this
  brief asks for, not a hypothetical one.
- **Symbol search & company news:** Finnhub (free tier covers this
  regardless of exchange).
- **Index values (NIFTY, SENSEX, etc.):** simulated. Free-tier index
  data for Indian markets isn't available from either provider used
  here, and this is purely contextual UI (a ticker strip), never the
  basis for any actual detection logic — so it's simulated with
  realistic, slowly-drifting values rather than left blank or faked
  as something it isn't.

## Handling stale, delayed, or failing data

- If a live quote fetch fails, the app falls back to the last known
  cached price (from stored history) and marks it as potentially
  stale in the response, rather than showing an error or a blank row.
- Retries with backoff are used for transient failures.
- Insufficient history for a stock is treated as "not enough data yet"
  — never silently guessed at or falsely flagged.
- A global error boundary and API error handling keep one bad data
  point from breaking the rest of the page.

## Scope decisions (what's deliberately not here)

Signal intentionally does not clone Groww's full product surface:

- No Bonds, IPOs, Mutual Funds, or Holdings/Positions/Orders — these
  are unrelated to the watchlist problem this brief is about, and
  building hollow versions of them (without real trading data behind
  them) would add padding, not substance.
- The Explore page's browsable list is a curated ~100 stocks, not all
  ~2000 NSE-listed symbols — fetching live quotes for thousands of
  symbols isn't realistic against a free-tier rate limit (60
  calls/minute), and it wouldn't add judgment value over a well-chosen
  curated set. The search bar is not limited to this curated list,
  though — any real stock can be found and added directly.

## Tech stack

- **Frontend:** React (Vite), Three.js (background visuals),
  Recharts (sparklines)
- **Backend:** Node.js, Express, node-cron (scheduled snapshotting)
- **Database:** MongoDB (Mongoose)
- **External APIs:** Yahoo Finance (unofficial, quotes), Finnhub
  (symbol search, company news)
- **Auth:** JWT, bcrypt

## Setup

```bash
# Backend
cd backend
npm install
# Create a .env file with:
#   MONGO_URI=<your MongoDB connection string>
#   JWT_SECRET=<any secret string>
#   FINNHUB_API_KEY=<your free Finnhub API key>
#   PORT=5000
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## What I'd improve with more time

- Replace polling with WebSocket-pushed price updates for a truly live
  feel instead of periodic refresh.
- Cross-validate prices against a second data source when one looks
  suspicious, rather than trusting a single (unofficial) source.
- A personalized sensitivity control, letting users choose how
  aggressively "unusual" is defined for their own risk tolerance.
- Compare a flagged stock's move against its sector/index to
  distinguish company-specific news from a broad market move.
