/**
 * Error Boundary Component
 * Catches errors in child component tree and displays fallback UI
 * Supports last-known-good rollback and retry functionality
 */
import { Component } from 'preact';
import { html } from 'htm/preact';

/**
 * Error Boundary class component
 * Must be a class component as hooks don't support error boundaries yet
 */
export class ErrorBoundary extends Component {
  state = {
    error: null,
    errorInfo: null,
    useLastKnownGood: false
  };

  /** @type {any} */
  _lastKnownGood = null;

  /**
   * Derive error state from caught error
   */
  static getDerivedStateFromError(error) {
    return { error };
  }

  /**
   * Log error details for debugging/analytics
   */
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);

    this.setState({ errorInfo });
  }

  /**
   * Reset error state and retry rendering
   */
  retry = () => {
    this.setState({ error: null, errorInfo: null, useLastKnownGood: false });
  };

  /**
   * Rollback to last known good state if available
   */
  rollback = () => {
    if (this._lastKnownGood) {
      this.setState({ error: null, errorInfo: null, useLastKnownGood: true });
    }
  };

  render({ children, fallback, name = 'Component' }, { error, errorInfo, useLastKnownGood }) {
    if (error) {
      // Use custom fallback if provided
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({
              error,
              errorInfo,
              retry: this.retry,
              rollback: this.rollback,
              hasLastKnownGood: !!this._lastKnownGood
            })
          : fallback;
      }

      // Default error UI
      return html`
        <div class="error-boundary-fallback" style=${{
          padding: '1rem',
          backgroundColor: 'rgba(255, 59, 48, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          color: '#ff3b30',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h3 style=${{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
            ${name} Error
          </h3>
          <p style=${{ margin: '0 0 1rem 0', fontSize: '0.875rem', opacity: 0.8 }}>
            ${error.message || 'Something went wrong'}
          </p>
          <div style=${{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick=${this.retry}
              style=${{
                padding: '0.5rem 1rem',
                backgroundColor: '#ff3b30',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Retry
            </button>
            ${this._lastKnownGood && html`
              <button
                onClick=${this.rollback}
                style=${{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#ff3b30',
                  border: '1px solid #ff3b30',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Rollback
              </button>
            `}
          </div>
        </div>
      `;
    }

    // Capture last-known-good render so rollback can bypass a failing update.
    if (!useLastKnownGood) {
      this._lastKnownGood = children;
    }

    return useLastKnownGood && this._lastKnownGood ? this._lastKnownGood : children;
  }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary(WrappedComponent, options = {}) {
  const { fallback, name } = options;

  return function BoundedComponent(props) {
    return html`
      <${ErrorBoundary} fallback=${fallback} name=${name || WrappedComponent.name}>
        <${WrappedComponent} ...${props} />
      <//>
    `;
  };
}
