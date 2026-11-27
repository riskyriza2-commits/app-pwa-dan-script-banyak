import React, { useState } from 'react';
import {
  Download,
  MonitorSmartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DrawerModal } from './DrawerModal';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'secondary' | 'compact';
  showFallback?: boolean;
  onInstalledToast?: (msg: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'primary',
  showFallback = true,
  onInstalledToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onInstalledToast) {
        onInstalledToast('ECO-TING berhasil dipasang ke perangkat.');
      }
      return;
    }
    setShowGuide(true);
  };

  if (!isInstallable && !isIOS && !showFallback) {
    return null;
  }

  const buttonClasses =
    variant === 'compact'
      ? 'inline-flex items-center gap-2 rounded-lg border border-[#e1e9e3] dark:border-[#243329] bg-white dark:bg-[#15211a] px-3 py-2 min-h-[40px] text-xs font-semibold text-[#0f7a35] dark:text-[#4ade80] hover:bg-[#f3f7f4] dark:hover:bg-[#1c2b22] transition-colors whitespace-nowrap shrink-0'
      : variant === 'secondary'
        ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-[#0f7a35]/30 dark:border-[#27b04f]/40 bg-[#e9f7ee] dark:bg-[#163322] px-4 py-2.5 min-h-[44px] text-sm font-semibold text-[#0f7a35] dark:text-[#6ee7a0] hover:bg-[#daf2e2] dark:hover:bg-[#1c402b] transition-colors whitespace-nowrap shrink-0'
        : 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f7a35] hover:bg-[#0c652b] text-white px-4 py-2.5 min-h-[44px] text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0';

  const label = isIOS ? 'Install di iOS' : 'Install Aplikasi';

  return (
    <>
      <button type="button" onClick={handleClick} className={buttonClasses}>
        <Download className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </button>

      <DrawerModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title={isIOS ? 'Pasang di iPhone / iPad' : 'Pasang Aplikasi ECO-TING'}
        subtitle="Pasang ke layar utama atau unduh file aplikasi offline."
        maxWidthClass="md:max-w-md"
      >
        <div className="space-y-4 text-sm">
          {isIOS ? (
            <div className="rounded-xl border border-[#e1e9e3] dark:border-[#243329] bg-[#f3f7f4] dark:bg-[#0c1510] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0f7a35]/10 text-[#0f7a35] dark:text-[#4ade80] flex items-center justify-center shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold">1. Ketuk tombol Bagikan (Share)</p>
                  <p className="text-xs text-[#5f7367] dark:text-[#93a89b] mt-0.5">
                    Pilih ikon kotak dengan panah ke atas di bilah Safari.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0f7a35]/10 text-[#0f7a35] dark:text-[#4ade80] flex items-center justify-center shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold">2. Pilih Tambah ke Layar Utama</p>
                  <p className="text-xs text-[#5f7367] dark:text-[#93a89b] mt-0.5">
                    Gulir ke bawah lalu ketuk &ldquo;Add to Home Screen&rdquo; / &ldquo;Tambah ke Layar Utama&rdquo;.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#e1e9e3] dark:border-[#243329] bg-[#f3f7f4] dark:bg-[#0c1510] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0f7a35]/10 text-[#0f7a35] dark:text-[#4ade80] flex items-center justify-center shrink-0">
                  <MonitorSmartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold">Install langsung (Chrome / Edge Android &amp; PC)</p>
                  <p className="text-xs text-[#5f7367] dark:text-[#93a89b] mt-1 leading-relaxed">
                    Buka URL aplikasi di tab browser penuh (di luar pratinjau tersemat), lalu ketuk ikon <strong>Install</strong> di bilah alamat atau menu <strong>⋮ → Tambahkan ke layar utama / Install app</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-2 border-t border-[#e1e9e3] dark:border-[#243329]">
                <div className="w-8 h-8 rounded-lg bg-[#0f7a35]/10 text-[#0f7a35] dark:text-[#4ade80] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold">Atau buat file APK via PWABuilder</p>
                  <p className="text-xs text-[#5f7367] dark:text-[#93a89b] mt-0.5 leading-relaxed">
                    Salin URL live aplikasi ini ke <strong>pwabuilder.com</strong> untuk langsung mengunduh file paket <strong>.apk / Android App</strong> dengan ikon resmi ECO-TING.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Direct Offline HTML File Download */}
          <a
            href="/ECO-TING-App.html"
            download="ECO-TING-App.html"
            className="w-full min-h-[44px] rounded-xl border border-[#e1e9e3] dark:border-[#243329] bg-white dark:bg-[#15211a] hover:border-[#0f7a35] px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileDown className="w-4 h-4 text-[#0f7a35] dark:text-[#6ee7a0]" />
            <span>Unduh File Offline (ECO-TING-App.html)</span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(false)}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-[#0f7a35] hover:bg-[#0c652b] text-white font-semibold text-sm transition-colors"
        >
          Tutup
        </button>
      </DrawerModal>
    </>
  );
};
