import React from 'react';

// Error Boundary global: evita a "tela branca" quando um erro de renderização
// escapa. Mostra uma mensagem amigável e permite recarregar.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log para telemetria futura; por ora, console.
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-1">Algo deu errado</h1>
          <p className="text-sm text-gray-500 mb-6">
            Ocorreu um erro inesperado ao exibir esta página. Você pode recarregar e tentar novamente.
          </p>
          {this.state.error?.message && (
            <pre className="text-left text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 overflow-x-auto text-slate-600">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
