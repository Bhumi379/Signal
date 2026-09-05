import { useEffect, useMemo, useState } from 'react';
import InfoTip from '../components/InfoTip';
import api from '../services/api';

function ExplorePage() {
  const [stocks, setStocks] = useState([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState(new Set());
  const [filter, setFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [capFilter, setCapFilter] = useState('');
  const [quickFilters, setQuickFilters] = useState({ gainers: false, losers: false, unusual: false });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [isLoading, setIsLoading] = useState(true);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadExplore() {
      setIsLoading(true);
      try {
        const [exploreResponse, watchlistResponse] = await Promise.all([
          api.get('/api/explore'),
          api.get('/api/watchlist'),
        ]);
        if (active) {
          setStocks(exploreResponse.data);
          setWatchlistSymbols(new Set(watchlistResponse.data.map((item) => item.symbol)));
          setError('');
        }
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || 'Unable to load explore data');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadExplore();
    return () => {
      active = false;
    };
  }, []);

  const filteredStocks = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const matches = stocks.filter((stock) => !query
      || stock.symbol.toLowerCase().includes(query)
      || stock.companyName.toLowerCase().includes(query)).filter((stock) => {
      const percentChange = stock.quote?.percentChange;
      if (sectorFilter && stock.sector !== sectorFilter) return false;
      if (capFilter && stock.capTier !== capFilter) return false;
      if (quickFilters.gainers && !(percentChange > 0)) return false;
      if (quickFilters.losers && !(percentChange < 0)) return false;
      if (quickFilters.unusual && !stock.meaningfulChange?.isMeaningful) return false;
      return true;
    });

    if (!sortConfig.key) return matches;

    return [...matches].sort((first, second) => {
      const firstValue = sortConfig.key === 'price'
        ? first.quote?.currentPrice ?? -Infinity
        : sortConfig.key === 'change'
          ? first.quote?.percentChange ?? -Infinity
          : first.quote?.volume ?? -Infinity;
      const secondValue = sortConfig.key === 'price'
        ? second.quote?.currentPrice ?? -Infinity
        : sortConfig.key === 'change'
          ? second.quote?.percentChange ?? -Infinity
          : second.quote?.volume ?? -Infinity;
      const comparison = firstValue - secondValue;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [capFilter, filter, quickFilters, sectorFilter, sortConfig, stocks]);

  const hasActiveFilters = Boolean(filter.trim() || sectorFilter || capFilter
    || Object.values(quickFilters).some(Boolean));

  function toggleQuickFilter(key) {
    setQuickFilters((current) => ({ ...current, [key]: !current[key] }));
  }

  function clearFilters() {
    setFilter('');
    setSectorFilter('');
    setCapFilter('');
    setQuickFilters({ gainers: false, losers: false, unusual: false });
  }

  function handleSort(key) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  async function handleAdd(symbol) {
    setAddingSymbol(symbol);
    try {
      await api.post('/api/watchlist', { symbol });
      setWatchlistSymbols((current) => new Set([...current, symbol]));
    } catch (addError) {
      setError(addError.response?.data?.message || 'Unable to add that stock');
    } finally {
      setAddingSymbol(null);
    }
  }

  function formatVolume(volume) {
    return typeof volume === 'number' ? volume.toLocaleString('en-IN') : '—';
  }

  return (
    <div className="explore-page dashboard-page--reveal">
      <section className="explore-intro">
        <p className="explore-kicker">Market view</p>
        <h1 className="dashboard-heading">Explore the market</h1>
        <p className="dashboard-subtext">Browse popular companies and add a stock to your watchlist.</p>
      </section>

      <div className="explore-summary-tile">
        <span>{stocks.filter((stock) => stock.quote?.percentChange > 0).length} stocks trending up today</span>
        <strong>{stocks.filter((stock) => stock.meaningfulChange?.isMeaningful).length} flagged as unusual</strong>
      </div>

      <section className="explore-table-section" aria-labelledby="explore-table-title">
        <div className="explore-table-toolbar">
          <label className="explore-filter">
            <span className="sr-only">Filter explore stocks</span>
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by company or symbol" />
          </label>
          {!isLoading && <span className="explore-count">{filteredStocks.length} of {stocks.length} stocks</span>}
        </div>

        <div className="explore-filter-bar" aria-label="Explore filters">
          <label>
            <span className="sr-only">Sector</span>
            <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
              <option value="">All Sectors</option>
              {['IT', 'Banking & Finance', 'Energy', 'FMCG', 'Pharma', 'Auto', 'Metals', 'Telecom'].map((sector) => <option key={sector} value={sector}>{sector}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Market Cap</span>
            <select value={capFilter} onChange={(event) => setCapFilter(event.target.value)}>
              <option value="">All</option>
              {['Large Cap', 'Mid Cap', 'Small Cap'].map((cap) => <option key={cap} value={cap}>{cap}</option>)}
            </select>
          </label>
          <button type="button" className={`explore-filter-chip${quickFilters.gainers ? ' explore-filter-chip--active' : ''}`} onClick={() => toggleQuickFilter('gainers')}>Gainers</button>
          <button type="button" className={`explore-filter-chip${quickFilters.losers ? ' explore-filter-chip--active' : ''}`} onClick={() => toggleQuickFilter('losers')}>Losers</button>
          <button type="button" className={`explore-filter-chip${quickFilters.unusual ? ' explore-filter-chip--active' : ''}`} onClick={() => toggleQuickFilter('unusual')}>Unusual only</button>
          {hasActiveFilters && <button type="button" className="explore-clear-filters" onClick={clearFilters}>Clear filters</button>}
        </div>

        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {isLoading ? (
          <div className="explore-table-skeleton" aria-label="Loading explore stocks">
            {[1, 2, 3, 4, 5, 6].map((row) => <div key={row} />)}
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="explore-empty">
            {filter.trim() ? 'No stocks match your search' : hasActiveFilters ? 'No stocks match your filters' : 'Explore data is unavailable right now'}
          </div>
        ) : (
          <div className="explore-table-wrap">
            <table className="explore-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th><button type="button" onClick={() => handleSort('price')}>Price</button></th>
                  <th><button type="button" onClick={() => handleSort('change')}>1D Change</button> <InfoTip label="About one day change">How much the price has moved since yesterday's market close.</InfoTip></th>
                  <th><button type="button" onClick={() => handleSort('volume')}>Volume</button> <InfoTip label="About volume">How many shares of this stock have been traded today. Higher volume usually means more people are paying attention to it right now.</InfoTip></th>
                  <th aria-label="Watchlist action" />
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => {
                  const percentChange = stock.quote?.percentChange;
                  const isAdded = watchlistSymbols.has(stock.symbol);
                  return (
                    <tr className={stock.meaningfulChange?.isMeaningful ? 'explore-table-row explore-table-row--flagged' : 'explore-table-row'} key={stock.symbol}>
                      <td>
                        <div className="explore-company">
                          <span className="explore-company-mark">{stock.companyName.charAt(0)}</span>
                          <span>
                            <strong>{stock.companyName}</strong>
                            <small>{stock.symbol}{stock.meaningfulChange?.isMeaningful && <em><i />Unusual <InfoTip label="About unusual move">This stock moved a lot more than it normally does, based on its own recent history — not just a big number, but unusual for this stock specifically.</InfoTip></em>}</small>
                          </span>
                        </div>
                      </td>
                      <td className="explore-number">{stock.quote?.currentPrice != null ? `₹${stock.quote.currentPrice.toFixed(2)}` : '—'}</td>
                      <td className={`explore-number ${percentChange == null ? '' : percentChange >= 0 ? 'watchlist-change--up' : 'watchlist-change--down'}`}>
                        {percentChange != null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%` : '—'}
                      </td>
                      <td className="explore-number">{formatVolume(stock.quote?.volume)}</td>
                      <td className="explore-action-cell">
                        {isAdded ? <span className="explore-added">✓ Added</span> : (
                          <button type="button" className="explore-add-button" onClick={() => handleAdd(stock.symbol)} disabled={addingSymbol === stock.symbol}>
                            {addingSymbol === stock.symbol ? '...' : '+'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ExplorePage;
