import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class EB extends React.Component<{ children: React.ReactNode }, { err?: Error }> {
  state: { err?: Error } = {}
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (this.state.err) return <pre style={{ padding: 20, color: '#b91c1c', whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.err.message}{'\n\n'}{this.state.err.stack}</pre>
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EB>
      <App />
    </EB>
  </React.StrictMode>,
)
