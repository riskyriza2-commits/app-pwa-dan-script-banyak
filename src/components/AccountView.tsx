import React, { useState } from 'react';
import {
  CreditCard,
  LogOut,
  RotateCcw,
  Sun,
  Moon,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { User } from '../types/ecoting';
import { getDisplayName } from '../data/ecotingStore';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';
import { DrawerModal } from './DrawerModal';

interface AccountViewProps {
  user: User;
  isCloudMode?: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  user,
  isCloudMode = false,
  theme,
  onToggleTheme,
  onResetDemo,
  onLogout,
  onToast,
}) => {
  const { isInstalled } = usePWAInstall();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <section className="rounded-3xl bg-gradient-to-b from-[#25c13b] to-[#198f32] dark:from-[#126825] dark:to-[#0d4619] text-white p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-white bg-white/20 flex items-center justify-center text-2xl font-extrabold shrink-0">
            {user.nama[0]?.toUpperCase() || 'E'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-50">
              {user.role === 'pengumpul' ? 'Akun Pengumpul' : 'Akun Pengepul'}
            </p>
            <h1 className="text-xl md:text-2xl font-extrabold truncate">
              {getDisplayName(user)}
            </h1>
            <p className="text-xs text-emerald-50/90 mt-0.5 truncate">
              {user.role === 'pengepul' && user.usaha ? `Pemilik: ${user.nama} · ` : ''}
              {user.alamat ? `${user.alamat} · ` : ''}
              {user.email}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Bank Account Card */}
        <section className="rounded-3xl bg-white dark:bg-[#15211a] border border-[#dce6dc] dark:border-[#243329] p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <CreditCard className="w-4 h-4 text-[#0f7a35] dark:text-[#6ee7a0]" />
            <h2>Rekening terdaftar</h2>
          </div>
          <div className="rounded-2xl bg-[#f4f9f4] dark:bg-[#0c1510] border border-[#dce6dc] dark:border-[#243329] p-4">
            <p className="text-xs text-[#5f7367] dark:text-[#93a89b]">Bank / E-Wallet</p>
            <p className="text-base font-bold mt-0.5">
              {user.bank || '-'}{' '}
              <span className="font-mono-num text-sm font-semibold text-[#5f7367] dark:text-[#93a89b]">
                · {user.rek || 'belum diisi'}
              </span>
            </p>
          </div>
        </section>

        {/* PWA Installation Card */}
        <section className="rounded-3xl bg-white dark:bg-[#15211a] border border-[#dce6dc] dark:border-[#243329] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <Smartphone className="w-4 h-4 text-[#0f7a35] dark:text-[#6ee7a0]" />
              <h2>Aplikasi Terinstall (PWA)</h2>
            </div>
            {isInstalled && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b5a28] dark:text-[#6ee7a0]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terpasang</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#5f7367] dark:text-[#93a89b] leading-relaxed">
            {isInstalled
              ? 'ECO-TING berjalan dalam mode aplikasi terpasang (standalone) dan siap digunakan offline.'
              : 'Pasang ECO-TING ke layar utama Android, iPhone, atau Desktop agar terbuka tanpa bilah browser dan tetap jalan saat offline.'}
          </p>
          {!isInstalled && (
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <PWAInstallButton
                variant="secondary"
                showFallback
                onInstalledToast={onToast}
              />
              <a
                href="/ECO-TING-App.html"
                download="ECO-TING-App.html"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dce6dc] dark:border-[#243329] bg-[#f4f9f4] dark:bg-[#0c1510] hover:border-[#0f7a35] px-4 py-2.5 min-h-[44px] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>Unduh File Offline (.html)</span>
              </a>
            </div>
          )}
        </section>

        {/* Theme & Preferences */}
        <section className="rounded-3xl bg-white dark:bg-[#15211a] border border-[#dce6dc] dark:border-[#243329] p-5 space-y-3">
          <h2 className="text-sm font-bold">Tampilan antarmuka</h2>
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full min-h-[44px] rounded-full border border-[#dce6dc] dark:border-[#243329] bg-[#f4f9f4] dark:bg-[#0c1510] hover:border-[#0f7a35] px-4 py-2.5 flex items-center justify-between text-sm font-semibold transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>{theme === 'dark' ? 'Mode Gelap aktif' : 'Mode Terang aktif'}</span>
            </span>
            <span className="text-xs text-[#0f7a35] dark:text-[#6ee7a0]">Ubah</span>
          </button>
        </section>

        {/* Account Actions */}
        <section className="rounded-3xl bg-white dark:bg-[#15211a] border border-[#dce6dc] dark:border-[#243329] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Kelola data &amp; sesi</h2>
            <span className="text-[11px] font-bold text-[#0f7a35] dark:text-[#6ee7a0]">
              {isCloudMode ? 'Sinkron Cloud Aktif' : 'Mode Demo Lokal'}
            </span>
          </div>
          <div className={`grid grid-cols-1 ${isCloudMode ? '' : 'sm:grid-cols-2'} gap-3`}>
            {!isCloudMode && (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="min-h-[44px] rounded-full border border-[#dce6dc] dark:border-[#243329] bg-[#f4f9f4] dark:bg-[#0c1510] hover:bg-[#e7efe9] dark:hover:bg-[#1a2920] px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset data demo</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] rounded-full bg-[#c95b53] hover:bg-[#b04840] text-white px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </section>
      </div>

      <p className="text-center text-xs text-[#5f7367] dark:text-[#93a89b] pt-2">
        ECO-TING · Kelompok 7 Kelas D · Aplikasi Bank Sampah Digital
      </p>

      {/* In-app Reset Confirmation Modal */}
      <DrawerModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset semua data demo?"
        subtitle="Seluruh setoran, saldo, dan perubahan harga akan kembali ke data awal."
        maxWidthClass="md:max-w-md"
      >
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Tindakan ini akan menghapus riwayat transaksi lokal di perangkat Anda dan mengeluarkan sesi saat ini.</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className="min-h-[44px] rounded-xl border border-[#e1e9e3] dark:border-[#243329] font-semibold text-sm hover:bg-[#f3f7f4] dark:hover:bg-[#1a2920] transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmReset(false);
              onResetDemo();
            }}
            className="min-h-[44px] rounded-xl bg-[#d6453d] hover:bg-[#b8352e] text-white font-bold text-sm transition-colors"
          >
            Ya, Reset Data
          </button>
        </div>
      </DrawerModal>
    </div>
  );
};
