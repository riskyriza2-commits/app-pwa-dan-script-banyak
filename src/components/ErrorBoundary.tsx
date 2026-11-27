import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { getFirestoreUpgradeUrl } from '../firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuota: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuota: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : String(error);
    let readable = raw;
    let isQuota = raw.includes('Quota exceeded') || raw.includes('Free daily read units');

    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        isQuota =
          parsed.error.includes('Quota exceeded') ||
          parsed.error.includes('Free daily read units');
        readable = isQuota
          ? 'Kuota harian Firestore tercapai dan akan direset besok.'
          : `Operasi database gagal (${parsed.operationType || 'write'} pada ${parsed.path || '-'}): ${parsed.error}`;
      }
    } catch {
      // plain error message
    }

    return { hasError: true, message: readable, isQuota };
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#f4f9f4] dark:bg-[#0c1510] text-[#102916] dark:text-[#e8f3ec] flex items-center justify-center p-5">
        <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#15211a] border border-[#dce6dc] dark:border-[#243329] p-6 text-center space-y-4 shadow-md">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold">Terjadi Gangguan Koneksi Data</h1>
          <p className="text-xs text-[#4b6e50] dark:text-[#9fc2a7] leading-relaxed break-words">
            {this.state.message}
          </p>
          {this.state.isQuota && (
            <a
              href={getFirestoreUpgradeUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-bold text-[#0f7a35] dark:text-[#6ee7a0] underline"
            >
              Lihat detail kuota di Firebase Console
            </a>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[44px] rounded-full bg-[#2eb547] hover:bg-[#239c3a] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            <span>Muat Ulang Aplikasi</span>
          </button>
        </div>
      </div>
    );
  }
}
