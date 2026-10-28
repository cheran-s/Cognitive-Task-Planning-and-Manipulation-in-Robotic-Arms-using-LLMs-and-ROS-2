import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert, Cpu } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  isSceneBoundary?: boolean;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, isSceneBoundary } = this.props;
      const errorMessage = this.state.error?.message || 'An unexpected runtime error occurred.';

      // Specialized 3D Scene Viewport Fallback
      if (isSceneBoundary) {
        return (
          <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-[#0b0d12] border border-[#282e3a] p-6 text-center select-none font-sans">
            <div className="w-12 h-12 rounded-full bg-[#ef444415] border border-[#ef444444] flex items-center justify-center mb-3">
              <Cpu size={24} className="text-[#ef4444]" />
            </div>
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">
              {fallbackTitle || '3D Viewport Offline'}
            </h3>
            <p className="text-xs text-[#94a3b8] max-w-md font-mono mb-4 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReset}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                <span>Re-initialize 3D Viewport</span>
              </button>
            </div>
          </div>
        );
      }

      // Full Application Fallback
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#0b0d12] text-[#f1f5f9] p-6 font-sans">
          <div className="bg-[#131720] border border-[#ef444455] rounded-lg p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#282e3a]">
              <div className="p-2 bg-[#ef444422] rounded border border-[#ef444444]">
                <ShieldAlert size={20} className="text-[#ef4444]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#f1f5f9]">
                  {fallbackTitle || 'Cognitive Studio Runtime Guard'}
                </h2>
                <span className="text-[11px] text-[#64748b] font-mono">
                  Fault Isolated • Safe Recovery Available
                </span>
              </div>
            </div>

            <div className="bg-[#0b0d12] border border-[#222836] rounded p-3 font-mono text-xs text-[#f87171] max-h-36 overflow-y-auto break-all">
              {errorMessage}
            </div>

            <div className="text-xs text-[#94a3b8] leading-relaxed">
              A subsystem encountered an unhandled exception. The application state was preserved
              to prevent complete crash.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#282e3a]">
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary text-xs"
              >
                Reload Studio
              </button>
              <button
                onClick={this.handleReset}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                <span>Reset Application State</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
