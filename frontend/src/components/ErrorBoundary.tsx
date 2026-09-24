import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('CareerHub UI error', error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="route-state"><p className="eyebrow">500 · TEMPORARY INTERRUPTION</p><h1>We hit an unexpected snag.</h1><p>Your account and saved work are safe. Reload this page to try again.</p><button className="primary-button" type="button" onClick={() => window.location.reload()}>Reload CareerHub</button></main>;
    return this.props.children;
  }
}
