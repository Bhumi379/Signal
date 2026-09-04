import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingSymbol, setRemovingSymbol] = useState(null);
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const [error, setError] = useState('');

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

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

  useEffect(() => {
    loadWatchlist(true);
    const intervalId = window.setInterval(() => loadWatchlist(), 45000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function handleAdd(event) {
    event.preventDefault();
    const nextSymbol = symbol.trim().toUpperCase();
    if (!nextSymbol || isAdding) return;

    setIsAdding(true);
    setError('');
    try {
      await api.post('/api/watchlist', { symbol: nextSymbol });
      setSymbol('');
      await loadWatchlist();
    } catch (addError) {
      setError(addError.response?.data?.message || 'Unable to add that symbol');
    } finally {
      setIsAdding(false);
    }
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
      <header className="dashboard-header">
        <div className="dashboard-brand" aria-label="Signal home">
          <span className="dashboard-brand-mark">S</span>
          <span>Signal</span>
        </div>
        <div className="dashboard-account">
          <span className="dashboard-user-name">{user?.name || 'Account'}</span>
          <button type="button" className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-intro">
          <h1 className="dashboard-heading">Your watchlist</h1>
          <p className="dashboard-subtext">Keep an eye on the moves that matter.</p>
        </section>

        <form className="watchlist-add" onSubmit={handleAdd}>
          <label className="sr-only" htmlFor="stock-symbol">Add a stock symbol</label>
          <input
            id="stock-symbol"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="Add a symbol, like AAPL"
            autoComplete="off"
            maxLength={12}
          />
          <button type="submit" className="btn-primary watchlist-add-button" disabled={isAdding || !symbol.trim()}>
            {isAdding ? 'Adding' : 'Add stock'}
          </button>
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
                      <span className={`watchlist-change ${percentChange >= 0 ? 'watchlist-change--up' : 'watchlist-change--down'}`}>
                        {percentChange != null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%` : '—'}
                      </span>
                      {isFlagged ? <span className="watchlist-flag"><i />Unusual</span> : <span />}
                    </button>
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
