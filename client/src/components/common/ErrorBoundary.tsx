/**
 * Error Boundary component for better error handling
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Что-то пошло не так</AlertTitle>
              <AlertDescription className="mt-2">
                Произошла неожиданная ошибка. Мы уже работаем над её исправлением.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 space-y-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Попробовать снова
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="default"
                className="w-full"
              >
                Перезагрузить страницу
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-gray-100 rounded-lg">
                <summary className="cursor-pointer font-medium">
                  Детали ошибки (только в режиме разработки)
                </summary>
                <pre className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}