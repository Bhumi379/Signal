import { Fragment, useEffect, useState } from 'react';
import { Line, LineChart } from 'recharts';
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
  const [watchlistFilter, setWatchlistFilter] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
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

  const filteredWatchlist = watchlist.filter((stock) => {
    const query = watchlistFilter.trim().toLowerCase();
    if (!query) return true;
    return stock.symbol.toLowerCase().includes(query)
      || stock.companyName?.toLowerCase().includes(query);
  });

  function getSortValue(stock, key) {
    if (key === 'price') return stock.quote?.currentPrice ?? -Infinity;
    if (key === 'change') return stock.quote?.percentChange ?? -Infinity;
    if (key === 'volume') return stock.quote?.volume ?? -Infinity;
    return stock.companyName || stock.symbol;
  }

  function sortStocks(stocks) {
    return [...stocks].sort((first, second) => {
      if (!sortConfig.key) return 0;
      const firstValue = getSortValue(first, sortConfig.key);
      const secondValue = getSortValue(second, sortConfig.key);
      const comparison = typeof firstValue === 'string'
        ? firstValue.localeCompare(secondValue)
        : firstValue - secondValue;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }

  function handleSort(key) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  function formatVolume(volume) {
    return typeof volume === 'number' ? volume.toLocaleString('en-IN') : '—';
  }

  function renderStockTable(stocks, emptyMessage) {
    if (!stocks.length) {
      return <div className="watchlist-table-empty">{emptyMessage}</div>;
    }

    return (
      <div className="watchlist-table-wrap">
        <table className="watchlist-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Trend</th>
              <th><button type="button" onClick={() => handleSort('price')}>Price</button></th>
              <th><button type="button" onClick={() => handleSort('change')}>1D Change</button></th>
              <th><button type="button" onClick={() => handleSort('volume')}>Volume</button></th>
              {isEditMode && <th aria-label="Edit actions" />}
            </tr>
          </thead>
          <tbody>
            {sortStocks(stocks).map((stock) => {
              const isFlagged = stock.meaningfulChange?.isMeaningful;
              const isExpanded = expandedSymbol === stock.symbol;
              const percentChange = stock.quote?.percentChange;
              const priceChange = stock.quote?.change;
              const trend = stock.trend?.length >= 2
                ? stock.trend
                : [{ value: stock.quote?.currentPrice || 0 }, { value: stock.quote?.currentPrice || 0 }];
              const trendUp = trend[trend.length - 1].value >= trend[0].value;
              const logoTone = stock.symbol.charCodeAt(0) % 4;

                return (
                <Fragment key={stock._id || stock.symbol}>
                  <tr
                    className={`watchlist-table-row${isFlagged ? ' watchlist-table-row--flagged' : ''}`}
                    onClick={() => isFlagged && setExpandedSymbol(isExpanded ? null : stock.symbol)}
                  >
                    <td className="company-cell">
                      <span className={`company-logo company-logo--${logoTone}`}>{(stock.companyName || stock.symbol).charAt(0)}</span>
                      <span className="company-copy">
                        <strong>{stock.companyName || stock.symbol}</strong>
                        <span>{stock.symbol}</span>
                        {isFlagged && <small className="watchlist-flag"><i />Unusual move</small>}
                        {stock.quote?.stale && <small className="watchlist-stale-note">Data may be delayed</small>}
                      </span>
                    </td>
                    <td className="trend-cell">
                      <LineChart width={92} height={32} data={trend}>
                        <Line type="monotone" dataKey="value" stroke={stock.trend?.length >= 2 ? (trendUp ? 'var(--up)' : 'var(--down)') : 'var(--text-muted)'} strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </td>
                    <td className="number-cell">{stock.quote?.currentPrice != null ? `₹${stock.quote.currentPrice.toFixed(2)}` : '—'}</td>
                    <td className={`number-cell change-cell ${percentChange == null ? '' : percentChange >= 0 ? 'watchlist-change--up' : 'watchlist-change--down'}`}>
                      {percentChange != null ? `${priceChange >= 0 ? '+' : '-'}₹${Math.abs(priceChange || 0).toFixed(2)} (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)` : '—'}
                    </td>
                    <td className="number-cell">{formatVolume(stock.quote?.volume)}</td>
                    {isEditMode && (
                      <td className="edit-cell">
                        <button type="button" className="remove-stock-button" onClick={(event) => { event.stopPropagation(); handleRemove(stock.symbol); }} disabled={removingSymbol === stock.symbol} aria-label={`Remove ${stock.symbol}`}>
                          {removingSymbol === stock.symbol ? '...' : '×'}
                        </button>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr className="watchlist-detail-row">
                      <td colSpan={isEditMode ? 6 : 5}>{stock.meaningfulChange?.reason}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const attentionStocks = filteredWatchlist.filter((stock) => stock.meaningfulChange?.isMeaningful);
  const watchingStocks = filteredWatchlist.filter((stock) => !stock.meaningfulChange?.isMeaningful);

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
          <div className="watchlist-toolbar">
            <label className="watchlist-filter-wrap">
              <span className="sr-only">Filter current watchlist</span>
              <input value={watchlistFilter} onChange={(event) => setWatchlistFilter(event.target.value)} placeholder="Filter your watchlist" />
            </label>
            <button type="button" className={`edit-toggle${isEditMode ? ' edit-toggle--active' : ''}`} onClick={() => setIsEditMode((active) => !active)}>
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="watchlist-heading-row">
            <h2 id="watchlist-title">Market watch</h2>
            {!isLoading && <span>{watchlist.length} {watchlist.length === 1 ? 'stock' : 'stocks'}</span>}
          </div>

          {isLoading ? (
            <div className="watchlist-list" aria-label="Loading watchlist">
              {[1, 2, 3].map((item) => <div className="watchlist-skeleton" key={item} />)}
            </div>
          ) : watchlist.length === 0 ? (
            <div className="watchlist-empty">
              <p>Your watchlist is empty.</p>
              <span>Add a symbol above to start tracking the market.</span>
            </div>
          ) : (
            <>
              {attentionStocks.length > 0 && <section className="watchlist-group"><h3>Needs attention</h3>{renderStockTable(attentionStocks, 'No unusual moves')}</section>}
              <section className="watchlist-group"><h3>Watching</h3>{renderStockTable(watchingStocks, attentionStocks.length ? 'No other stocks match your filter' : 'No stocks match your filter')}</section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
