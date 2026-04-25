import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  lastEndpoint: string | null;
  lastStatus: number | null;
}

// Global tracker for last API call (for debugging)
export const apiTracker = {
  lastEndpoint: null as string | null,
  lastStatus: null as number | null,
  lastError: null as string | null,
  patientId: null as string | null,
};

/**
 * ErrorBoundary - Catches React rendering errors and shows fallback UI
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      lastEndpoint: null,
      lastStatus: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastEndpoint: apiTracker.lastEndpoint,
      lastStatus: apiTracker.lastStatus,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Last API call:', apiTracker.lastEndpoint, 'Status:', apiTracker.lastStatus);
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleCopyBugReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      component: this.props.componentName || 'Unknown',
      error: this.state.error?.message,
      stack: this.state.error?.stack?.split('\n').slice(0, 5),
      lastEndpoint: this.state.lastEndpoint || apiTracker.lastEndpoint,
      lastStatus: this.state.lastStatus || apiTracker.lastStatus,
      lastError: apiTracker.lastError,
      patientId: apiTracker.patientId,
    };
    
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert('Bug report copied to clipboard');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <div className="error-icon">⚠️</div>
          <h3>{this.props.fallbackTitle || 'Something went wrong'}</h3>
          <p className="error-message">
            {this.props.componentName 
              ? `The ${this.props.componentName} component encountered an error.`
              : 'A rendering error occurred.'}
          </p>
          
          <div className="error-actions">
            <button className="btn-primary" onClick={this.handleReset}>
              Try Again
            </button>
            <button className="btn-secondary" onClick={this.handleCopyBugReport}>
              📋 Copy Bug Report
            </button>
          </div>

          <button 
            className="details-toggle"
            onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
          >
            {this.state.showDetails ? '▼ Hide Details' : '▶ Show Details'}
          </button>

          {this.state.showDetails && (
            <div className="error-details">
              <div className="detail-row">
                <span className="detail-label">Error:</span>
                <span className="detail-value">{this.state.error?.message}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last API:</span>
                <span className="detail-value">{this.state.lastEndpoint || 'None'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{this.state.lastStatus || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Patient ID:</span>
                <span className="detail-value">{apiTracker.patientId || 'None'}</span>
              </div>
              {this.state.errorInfo && (
                <pre className="stack-trace">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

