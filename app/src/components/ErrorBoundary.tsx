import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * App-level safety net: if any view throws during render, show a recoverable
 * message instead of a blank white screen (the app previously had no boundary,
 * so one bad data row crashed the whole page).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected error' }
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error)
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        data-testid="error-boundary"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1120',
          color: '#E2E8F0',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 20 }}>
            This page hit an unexpected error and couldn't load. Reloading usually fixes it.
          </p>
          <button
            data-testid="error-boundary-reload"
            onClick={this.handleReload}
            style={{
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
