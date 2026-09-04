import { Component } from 'react';

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Dashboard rendering error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="dashboard-fallback">
          <div>
            <h1>Signal could not load this view.</h1>
            <p>Your account is safe. Reload the dashboard to try again.</p>
            <button type="button" className="btn-primary" onClick={this.handleReload}>
              Reload dashboard
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;
