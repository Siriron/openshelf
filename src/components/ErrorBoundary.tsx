import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="page narrow">
          <h1>Something broke</h1>
          <p className="muted">{this.state.error.message}</p>
          <button className="btn" onClick={() => window.location.assign('/')}>
            Back to the shelf
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
