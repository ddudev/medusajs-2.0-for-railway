import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app.js"

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Backend UI] Root error:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            maxWidth: "600px",
            margin: "2rem auto",
          }}
        >
          <h1 style={{ color: "#b91c1c", marginBottom: "1rem" }}>
            Backend UI failed to load
          </h1>
          <p style={{ marginBottom: "0.5rem" }}>
            Open the browser console (F12 → Console) for details.
          </p>
          <pre
            style={{
              background: "#fef2f2",
              padding: "1rem",
              overflow: "auto",
              fontSize: "12px",
              border: "1px solid #fecaca",
              borderRadius: "4px",
            }}
          >
            {this.state.error.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
)
