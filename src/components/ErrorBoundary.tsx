'use client';

import React from 'react';
import { defineMessages, useT } from '@/lib/i18n';

const MESSAGES = defineMessages({
  en: { component: 'COMPONENT', error: '⚠ {name} ERROR', retry: 'RETRY' },
  it: { component: 'COMPONENTE', error: '⚠ ERRORE {name}', retry: 'RIPROVA' },
});

function ErrorFallback({ name, message, onRetry }: { name?: string; message?: string; onRetry: () => void }) {
  const t = useT(MESSAGES);
  return (
    <div className="flex items-center justify-center w-full h-full bg-[var(--bg-secondary)] rounded-lg border border-red-900/30 p-4">
      <div className="text-center">
        <div className="text-xs font-mono text-red-400 tracking-widest mb-2">
          {t('error', { name: name?.toUpperCase() || t('component') })}
        </div>
        <div className="text-[11px] font-mono text-[var(--text-muted)] max-w-[300px] truncate">
          {message}
        </div>
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1 text-[10px] font-mono tracking-widest text-[var(--gold-primary)] border border-[var(--border-primary)] rounded hover:bg-[var(--hover-accent)] transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[MinervaAI] ${this.props.name || 'Component'} Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          name={this.props.name}
          message={this.state.error?.message}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}
