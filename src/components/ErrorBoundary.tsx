import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-8">
          <h2 className="text-xl font-bold text-[var(--color-text)]">Something went wrong</h2>
          <p className="text-sm text-[var(--color-muted)]">{this.state.error.message}</p>
          <button className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white cursor-pointer" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
