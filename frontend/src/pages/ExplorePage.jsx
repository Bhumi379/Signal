function ExplorePage() {
  return (
    <div className="explore-page dashboard-page--reveal">
      <section className="explore-intro">
        <p className="explore-kicker">Market view</p>
        <h1 className="dashboard-heading">Explore the market</h1>
        <p className="dashboard-subtext">Search for a company above to discover a stock and add it to your watchlist.</p>
      </section>
      <div className="explore-note">
        <span className="explore-note-mark">S</span>
        <p>Use the search field in the navigation to find stocks by company name or symbol.</p>
      </div>
    </div>
  );
}

export default ExplorePage;
