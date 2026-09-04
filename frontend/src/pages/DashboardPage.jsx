import { useEffect, useState } from 'react';
import api from '../services/api';

function DashboardPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [symbolQuery, setSymbolQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingSymbol, setRemovingSymbol] = useState(null);
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const [digestItems, setDigestItems] = useState([]);
  const [showDigest, setShowDigest] = useState(false);
  const [isDigestExpanded, setIsDigestExpanded] = useState(false);
  const [error, setError] = useState('');

  async function loadWatchlist(showLoading = false) {
    if (showLoading) setIsLoading(true);

    try {
      const response = await api.get('/api/watchlist');
      setWatchlist(response.data);
      setError('');
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load your watchlist');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDigest() {
    try {
      const response = await api.get('/api/digest');
      if (!response.data.firstVisit && response.data.items?.length) {
        setDigestItems(response.data.items);
        setShowDigest(true);
      }
    } catch {
      // Digest content is supplemental; the watchlist should still load normally.
    }
  }

  async function markDigestSeen() {
    try {
      await api.post('/api/digest/mark-seen');
    } finally {
      setShowDigest(false);
    }
  }

  useEffect(() => {
    loadWatchlist(true);
    loadDigest();
    const intervalId = window.setInterval(() => loadWatchlist(), 45000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!showDigest) return undefined;
    const timeoutId = window.setTimeout(() => markDigestSeen(), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [showDigest]);

  useEffect(() => {
    const query = symbolQuery.trim();
    if (!query || selectedSymbol) {
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.get('/api/stocks/search', {
          params: { query },
          signal: controller.signal,
        });
        setSearchResults(response.data);
      } catch (searchError) {
        if (searchError.code !== 'ERR_CANCELED' && searchError.name !== 'CanceledError') {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [symbolQuery, selectedSymbol]);

  async function handleAdd(selected) {
    if (!selected?.symbol || isAdding) return;

    setIsAdding(true);
    setError('');
    try {
      await api.post('/api/watchlist', { symbol: selected.symbol });
      setSymbolQuery('');
      setSelectedSymbol(null);
      setSearchResults([]);
      setIsSearchOpen(false);
      await loadWatchlist();
    } catch (addError) {
      setError(addError.response?.data?.message || 'Unable to add that symbol');
    } finally {
      setIsAdding(false);
    }
  }

  function handleSearchInput(event) {
    setSymbolQuery(event.target.value);
    setSelectedSymbol(null);
    setIsSearchOpen(true);
  }

  function handleSelectResult(result) {
    setSelectedSymbol(result);
    setSymbolQuery(`${result.description} (${result.symbol})`);
    setIsSearchOpen(false);
    handleAdd(result);
  }

  async function handleRemove(stockSymbol) {
    setRemovingSymbol(stockSymbol);
    setError('');
    try {
      await api.delete(`/api/watchlist/${encodeURIComponent(stockSymbol)}`);
      setWatchlist((current) => current.filter((item) => item.symbol !== stockSymbol));
      if (expandedSymbol === stockSymbol) setExpandedSymbol(null);
    } catch (removeError) {
      setError(removeError.response?.data?.message || 'Unable to remove that symbol');
    } finally {
      setRemovingSymbol(null);
    }
  }

  const sortedWatchlist = [...watchlist].sort(
    (first, second) => Number(Boolean(second.meaningfulChange?.isMeaningful))
      - Number(Boolean(first.meaningfulChange?.isMeaningful)),
  );

  return (
    <div className="dashboard-page dashboard-page--reveal">
      <main className="dashboard-main">
        {showDigest && (
          <section className="digest-banner" aria-labelledby="digest-title">
            <div className="digest-banner-topline">
              <div>
                <p className="digest-kicker">New activity</p>
                <h2 id="digest-title">Since you last checked, {digestItems.length} {digestItems.length === 1 ? 'thing happened' : 'things happened'}</h2>
              </div>
              <button type="button" className="digest-dismiss" onClick={markDigestSeen}>Dismiss</button>
            </div>
            <div className="digest-items">
              {(isDigestExpanded ? digestItems : digestItems.slice(0, 3)).map((item) => (
                <div className="digest-item" key={`${item.symbol}-${item.detectedAt}`}>
                  <strong>{item.symbol}</strong>
                  <span>{item.reason}</span>
                </div>
              ))}
            </div>
            {digestItems.length > 3 && (
              <button
                type="button"
                className="digest-expand"
                onClick={() => setIsDigestExpanded((expanded) => !expanded)}
              >
                {isDigestExpanded ? 'Show less' : `See all ${digestItems.length}`}
              </button>
            )}
          </section>
        )}

        <section className="dashboard-intro">
          <h1 className="dashboard-heading">Your watchlist</h1>
          <p className="dashboard-subtext">Keep an eye on the moves that matter.</p>
        </section>

        <form className="watchlist-add" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="stock-symbol">Add a stock symbol</label>
          <div className="stock-search-wrap">
            <input
              id="stock-symbol"
              value={symbolQuery}
              onChange={handleSearchInput}
              onFocus={() => symbolQuery.trim() && setIsSearchOpen(true)}
              placeholder="Search stocks by name or symbol"
              autoComplete="off"
              maxLength={64}
              role="combobox"
              aria-expanded={isSearchOpen}
              aria-controls="stock-search-results"
            />
            {isSearchOpen && symbolQuery.trim() && (
              <div className="stock-search-results" id="stock-search-results" role="listbox">
                {isSearching ? (
                  <p className="stock-search-status">Searching...</p>
                ) : searchResults.length ? (
                  searchResults.map((result) => (
                    <button
                      type="button"
                      className="stock-search-result"
                      key={`${result.symbol}-${result.description}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectResult(result)}
                      role="option"
                    >
                      <strong>{result.description || 'Unknown company'}</strong>
                      <span>{result.symbol}</span>
                    </button>
                  ))
                ) : (
                  <p className="stock-search-status">No matches found</p>
                )}
              </div>
            )}
          </div>
        </form>

        {error && <p className="dashboard-error" role="alert">{error}</p>}

        <section className="watchlist-section" aria-labelledby="watchlist-title">
          <div className="watchlist-heading-row">
            <h2 id="watchlist-title">Market watch</h2>
            {!isLoading && <span>{watchlist.length} {watchlist.length === 1 ? 'stock' : 'stocks'}</span>}
          </div>

          {isLoading ? (
            <div className="watchlist-list" aria-label="Loading watchlist">
              {[1, 2, 3].map((item) => <div className="watchlist-skeleton" key={item} />)}
            </div>
          ) : sortedWatchlist.length === 0 ? (
            <div className="watchlist-empty">
              <p>Your watchlist is empty.</p>
              <span>Add a symbol above to start tracking the market.</span>
            </div>
          ) : (
            <div className="watchlist-list">
              {sortedWatchlist.map((stock) => {
                const isFlagged = stock.meaningfulChange?.isMeaningful;
                const isExpanded = expandedSymbol === stock.symbol;
                const percentChange = stock.quote?.percentChange;

                return (
                  <div className={`watchlist-item${isFlagged ? ' watchlist-item--flagged' : ''}`} key={stock._id || stock.symbol}>
                    <button
                      type="button"
                      className="watchlist-row"
                      onClick={() => isFlagged && setExpandedSymbol(isExpanded ? null : stock.symbol)}
                      aria-expanded={isFlagged ? isExpanded : undefined}
                    >
                      <span className="watchlist-symbol">{stock.symbol}</span>
                      <span className="watchlist-price">{stock.quote?.currentPrice != null ? `$${stock.quote.currentPrice.toFixed(2)}` : '—'}</span>
                      <span className={`watchlist-change ${percentChange == null ? '' : percentChange >= 0 ? 'watchlist-change--up' : 'watchlist-change--down'}`}>
                        {percentChange != null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%` : '—'}
                      </span>
                      {isFlagged ? <span className="watchlist-flag"><i />Unusual</span> : <span />}
                    </button>
                    {stock.quote?.stale && (
                      <p className="watchlist-stale-note">Data may be delayed</p>
                    )}
                    <button
                      type="button"
                      className="watchlist-remove"
                      onClick={() => handleRemove(stock.symbol)}
                      disabled={removingSymbol === stock.symbol}
                      aria-label={`Remove ${stock.symbol}`}
                    >
                      {removingSymbol === stock.symbol ? '...' : 'Remove'}
                    </button>
                    <div className={`watchlist-reason${isExpanded ? ' watchlist-reason--open' : ''}`}>
                      <p>{stock.meaningfulChange?.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
