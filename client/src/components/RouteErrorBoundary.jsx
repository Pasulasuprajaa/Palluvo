import React from 'react';
import { RotateCcw, Home, AlertCircle } from 'lucide-react';

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route chunk render error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    const isChunkFailure =
      this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
      this.state.error?.message?.includes('Loading chunk') ||
      this.state.error?.name === 'ChunkLoadError';

    if (isChunkFailure) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#FAF7F2] px-4 py-16 text-center animate-fade-in" role="alert">
          <div className="w-14 h-14 rounded-full bg-[#5B1425]/10 text-[#5B1425] flex items-center justify-center mb-4 shadow-xs">
            <AlertCircle className="w-7 h-7 text-[#5B1425]" />
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] mb-2">
            Unable to Load View
          </h2>

          <p className="text-xs sm:text-sm text-[#6E6467] max-w-md mb-6 leading-relaxed">
            A temporary connection issue occurred while loading this boutique view. Please refresh to load the latest version or return home.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#5B1425] hover:bg-[#7E1E34] text-[#FAF7F2] font-semibold text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry / Reload</span>
            </button>

            {this.props.onNavigate && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onNavigate('home');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#EAE2D7] hover:bg-[#FAF7F2] text-[#1F1A1C] font-semibold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none min-h-[44px]"
              >
                <Home className="w-3.5 h-3.5 text-[#5B1425]" />
                <span>Return to Home</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
