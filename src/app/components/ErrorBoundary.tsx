import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center text-slate-500">
            <p className="text-sm">حدث خطأ في تحميل هذا القسم.</p>
            <button
              className="text-sm text-blue-600 underline"
              onClick={() => this.setState({ hasError: false })}
            >
              إعادة المحاولة
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
