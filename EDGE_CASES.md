# Edge cases

- **Finnhub outage or timeout:** `getQuote` retries rate-limit responses twice, then falls back to the newest `StockSnapshot`. Cached responses include `stale: true` and `lastUpdated`, and the dashboard labels them as delayed.
- **Finnhub rate limiting:** HTTP 429 responses use short incremental backoff before the fallback path.
- **New users and limited history:** Change detection returns no flag until enough history exists. The dashboard safely renders missing quote and flag data instead of assuming either exists.
- **Concurrent watchlist edits:** A unique `{ userId, symbol }` MongoDB index prevents duplicate symbols atomically. Duplicate-key errors return a clean conflict response; an integration test verifies concurrent inserts.
- **Unhandled API errors:** Global Express error middleware logs the server-side message and returns a clean JSON response without exposing a stack trace.
- **Dashboard rendering failure:** A React error boundary isolates dashboard crashes and offers a reload action without blanking the entire app.