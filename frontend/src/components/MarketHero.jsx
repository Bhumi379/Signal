function MarketHero() {
  return (
    <aside className="market-hero" aria-hidden="true">
      <span className="market-hero-number market-hero-number--one">+2.4%</span>
      <span className="market-hero-number market-hero-number--two">₹24,692</span>
      <div className="market-card market-card--one">
        <div><strong>NIFTY 50</strong><span>Market index</span></div>
        <b>+0.46%</b>
        <svg viewBox="0 0 100 28"><path d="M2 24 L18 20 L28 22 L42 12 L56 16 L70 8 L82 11 L98 3" /></svg>
      </div>
      <div className="market-card market-card--two">
        <div><strong>INFY</strong><span>Infosys Ltd.</span></div>
        <b>+1.82%</b>
        <svg viewBox="0 0 100 28"><path d="M2 22 L16 24 L29 14 L41 18 L55 10 L66 13 L80 5 L98 8" /></svg>
      </div>
      <div className="market-card market-card--three">
        <div><strong>HDFCBANK</strong><span>HDFC Bank</span></div>
        <b className="market-card-down">-0.38%</b>
        <svg viewBox="0 0 100 28"><path d="M2 6 L18 10 L30 7 L44 16 L57 12 L70 21 L82 17 L98 24" /></svg>
      </div>
    </aside>
  );
}

export default MarketHero;
