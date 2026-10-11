import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Beklenmeyen bir uygulama hatası oluştu.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Earthquake Probability Mapper:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6"
        >
          <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <h1 className="text-lg font-bold">
                Uygulama Hatası / Runtime Error
              </h1>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sismik görselleştirme modülünde beklenmeyen bir hata meydana geldi:
            </p>
            <pre className="text-xs bg-slate-950 p-3 rounded border border-slate-800 text-red-300 overflow-x-auto">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Sayfayı Yenile / Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
