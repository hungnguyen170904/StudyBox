import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black/90 flex flex-col items-center justify-center text-white p-6">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-lg text-center backdrop-blur-md">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Đã xảy ra lỗi hệ thống!</h1>
            <p className="text-white/70 mb-6">
              Rất xin lỗi vì sự bất tiện này. Một lỗi không mong muốn đã xảy ra trong quá trình xử lý.
            </p>
            <div className="bg-black/50 p-4 rounded-lg text-left text-sm text-red-300 font-mono mb-6 overflow-auto max-h-32 custom-scrollbar">
              {this.state.error && this.state.error.toString()}
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all"
            >
              Quay lại Trang chủ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
