import React, { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, Leaf, LogOut, User as UserIcon } from 'lucide-react';
import type { Role, User } from '../types/ecoting';
import { BANK_OPTIONS } from '../data/ecotingStore';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthViewProps {
  users: User[];
  pendingFirebaseUser: FirebaseUser | null;
  authBusy?: boolean;
  onGoogleSignIn: () => Promise<void>;
  onCancelGoogleOnboarding: () => Promise<void>;
  onCompleteGoogleRegistration: (profile: {
    role: Role;
    nama: string;
    alamat: string;
    bank: string;
    rek: string;
    usaha?: string;
  }) => Promise<void>;
  onDemoLogin: (userId: string) => void;
  onToast: (msg: string) => void;
}

type AuthScreen = 'splash' | 'signin' | 'role' | 'signup';

export const AuthView: React.FC<AuthViewProps> = ({
  users,
  pendingFirebaseUser,
  authBusy = false,
  onGoogleSignIn,
  onCancelGoogleOnboarding,
  onCompleteGoogleRegistration,
  onDemoLogin,
  onToast,
}) => {
  const [screen, setScreen] = useState<AuthScreen>('splash');
  const [role, setRole] = useState<Role>('pengumpul');
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [usaha, setUsaha] = useState('');
  const [bank, setBank] = useState<string>(BANK_OPTIONS[0]);
  const [rek, setRek] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (pendingFirebaseUser) {
      setNama((prev) => prev || pendingFirebaseUser.displayName || '');
      setScreen((prev) => (prev === 'splash' || prev === 'signin' ? 'role' : prev));
    } else if (screen === 'role' || screen === 'signup') {
      setScreen('signin');
    }
  }, [pendingFirebaseUser]);

  const handleDemoLogin = (targetRole: Role) => {
    const demoEmail =
      targetRole === 'pengumpul' ? 'mahasiswa@demo.id' : 'pengepul@demo.id';
    const found = users.find(
      (u) => u.email === demoEmail && u.role === targetRole,
    );
    if (found) {
      onDemoLogin(found.id);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFirebaseUser || submitting) return;

    const cleanName = nama.trim().slice(0, 80);
    const cleanAlamat = (alamat.trim() || 'Tembalang, Semarang').slice(0, 200);
    const cleanUsaha = usaha.trim().slice(0, 80);
    const cleanRek = rek.replace(/[\s-]/g, '');

    if (!cleanName) {
      onToast('Isi nama lengkap Anda');
      return;
    }
    if (role === 'pengepul' && !cleanUsaha) {
      onToast('Isi nama usaha / bank sampah');
      return;
    }
    if (!/^[0-9]{8,16}$/.test(cleanRek)) {
      onToast('Nomor rekening harus 8–16 angka');
      return;
    }

    setSubmitting(true);
    try {
      await onCompleteGoogleRegistration({
        role,
        nama: cleanName,
        alamat: cleanAlamat,
        bank: bank.slice(0, 40),
        rek: cleanRek,
        usaha: role === 'pengepul' ? cleanUsaha : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-[#0c1510] text-[#102b18] dark:text-[#e8f3ec] flex flex-col">
      {/* Top vivid green strip + misty green aura matching Figma */}
      <div className="h-3 bg-[#24c23b] w-full shrink-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-3 inset-x-0 h-44 bg-gradient-to-b from-[#7ad886]/55 via-[#b9ebc0]/25 to-transparent dark:from-[#1b6b2d]/40 dark:via-[#12451e]/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#7ad886]/60 via-[#b9ebc0]/25 to-transparent dark:from-[#1b6b2d]/40 dark:via-[#12451e]/15"
      />

      {/* Top Bar */}
      <header className="relative z-10 w-full max-w-md md:max-w-lg mx-auto px-5 pt-4 flex items-center justify-between gap-3">
        {pendingFirebaseUser ? (
          <button
            type="button"
            onClick={() => {
              if (screen === 'signup') {
                setScreen('role');
              } else {
                void onCancelGoogleOnboarding();
              }
            }}
            className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[#144522] dark:text-[#8be69c] hover:opacity-80"
          >
            {screen === 'signup' ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span>Ubah Peran</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Ganti Akun Google</span>
              </>
            )}
          </button>
        ) : screen !== 'splash' ? (
          <button
            type="button"
            onClick={() => setScreen('splash')}
            className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[#144522] dark:text-[#8be69c] hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        ) : (
          <span className="text-xs font-bold text-[#144522] dark:text-[#8be69c]">
            Tembalang · Bank Sampah Digital
          </span>
        )}
        <PWAInstallButton variant="compact" onInstalledToast={onToast} />
      </header>

      {/* Main Centered Mobile/Tablet Frame */}
      <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-6 py-8 flex flex-col justify-center">
        {/* SCREEN 1: SPLASH */}
        {screen === 'splash' && !pendingFirebaseUser && (
          <div className="flex flex-col items-center text-center space-y-6 py-8">
            <div className="w-44 h-44 rounded-3xl bg-white/90 p-3 shadow-sm border border-[#d6ecd8] flex items-center justify-center">
              <img
                src="/ecoting-logo.png"
                alt="Logo ECO-TING"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0c3518] dark:text-white">
                ECO-TING
              </h1>
              <p className="text-xs text-[#3b5d44] dark:text-[#9fc2a7] max-w-xs mx-auto">
                Setor sampah terpilah, sinkronisasi transaksi real-time antar pengguna, dan buku besar otomatis.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScreen('signin')}
              className="w-48 min-h-[46px] rounded-full bg-[#2eb547] hover:bg-[#239c3a] text-white font-extrabold text-sm tracking-wider uppercase shadow-md transition-all active:scale-[0.98]"
            >
              MULAI
            </button>
          </div>
        )}

        {/* SCREEN 2: SIGN-IN WITH GOOGLE */}
        {screen === 'signin' && !pendingFirebaseUser && (
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="w-20 h-20 rounded-full bg-[#e9f7eb] dark:bg-[#163322] border border-[#96d39f] dark:border-[#2a5c38] flex items-center justify-center text-[#3a7b42] dark:text-[#6ee7a0]">
              <Leaf className="w-10 h-10" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-extrabold text-[#0c3518] dark:text-white">
                Masuk ke ECO-TING
              </h2>
              <p className="text-xs text-[#3b5d44] dark:text-[#9fc2a7] max-w-xs">
                Gunakan akun Google agar transaksi pengumpul dan pengepul tersinkron otomatis di semua perangkat.
              </p>
            </div>

            <button
              type="button"
              disabled={authBusy}
              onClick={() => void onGoogleSignIn()}
              className="w-full min-h-[48px] rounded-full border-2 border-[#3a7b42] dark:border-[#4b9955] bg-white dark:bg-[#15211a] hover:bg-[#e9f7eb] dark:hover:bg-[#1c3824] px-5 py-2.5 flex items-center justify-center gap-3 text-sm font-extrabold text-[#102b18] dark:text-white shadow-sm transition-colors disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.09.73-2.48 1.16-4.22 1.16-3.24 0-5.99-2.19-6.97-5.13H1.04v3.14C3.05 21.15 7.21 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.03 14.02A7.19 7.19 0 0 1 4.65 12c0-.7.13-1.38.38-2.02V6.84H1.04A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.04 5.16l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.85 1.04 6.84l3.99 3.14c.98-2.94 3.73-5.23 6.97-5.23Z"
                />
              </svg>
              <span>{authBusy ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
            </button>

            {/* Offline Local Demo Fallback */}
            <div className="w-full pt-4 border-t border-[#d6ecd8] dark:border-[#243329] text-center space-y-2">
              <p className="text-[11px] text-[#4c6b53] dark:text-[#93a89b]">
                Preview cepat lokal (tanpa sinkronisasi antar perangkat)
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('pengumpul')}
                  className="min-h-[38px] rounded-full border border-[#3a7b42]/50 bg-white/80 dark:bg-[#15211a] hover:border-[#2eb547] px-3 text-xs font-semibold transition-colors"
                >
                  Demo Pengumpul
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('pengepul')}
                  className="min-h-[38px] rounded-full border border-[#3a7b42]/50 bg-white/80 dark:bg-[#15211a] hover:border-[#2eb547] px-3 text-xs font-semibold transition-colors"
                >
                  Demo Pengepul
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: SAYA ADALAH (GOOGLE ONBOARDING) */}
        {screen === 'role' && pendingFirebaseUser && (
          <div className="flex flex-col items-center space-y-6 py-6">
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="w-16 h-16 rounded-full bg-[#102b18] text-white flex items-center justify-center shadow-sm">
                <UserIcon className="w-8 h-8" />
              </div>
              <p className="text-xs text-[#3b5d44] dark:text-[#9fc2a7]">
                {pendingFirebaseUser.email}
              </p>
              <p className="text-sm font-bold text-[#102b18] dark:text-[#e8f3ec]">
                Saya adalah:
              </p>
            </div>

            <div className="w-full space-y-3.5">
              <button
                type="button"
                onClick={() => {
                  setRole('pengumpul');
                  setScreen('signup');
                }}
                className="w-full min-h-[50px] rounded-full border-2 border-[#3a7b42] bg-white/95 dark:bg-[#15211a] hover:bg-[#e9f7eb] dark:hover:bg-[#1c3824] font-extrabold text-sm tracking-wide text-[#102b18] dark:text-white transition-colors"
              >
                PENGUMPUL
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('pengepul');
                  setScreen('signup');
                }}
                className="w-full min-h-[50px] rounded-full border-2 border-[#3a7b42] bg-white/95 dark:bg-[#15211a] hover:bg-[#e9f7eb] dark:hover:bg-[#1c3824] font-extrabold text-sm tracking-wide text-[#102b18] dark:text-white transition-colors"
              >
                PENGEPUL
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: COMPLETE PROFILE */}
        {screen === 'signup' && pendingFirebaseUser && (
          <div className="flex flex-col items-center space-y-4 py-2">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold tracking-wide text-[#0c3518] dark:text-white uppercase">
                {role === 'pengumpul' ? 'PENGUMPUL' : 'PENGEPUL'}
              </h2>
              {role === 'pengumpul' ? (
                <svg
                  viewBox="0 0 64 64"
                  className="w-14 h-14 mx-auto text-[#102b18] dark:text-[#8be69c]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="34" cy="12" r="6" />
                  <path d="M22 24c0-4 4-6 8-6h7c4 0 7 3 8 7l3 11-5 2-3-9-2 12 7 15h-6l-6-12-6 12h-6l6-16-2-10-4 7-4-3 4-10z" />
                  <path d="M12 24c0-4 4-6 8-5l3 10c1 4-2 8-6 8s-6-4-5-8z" opacity="0.85" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 64 64"
                  className="w-14 h-14 mx-auto text-[#102b18] dark:text-[#8be69c]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="22" cy="14" r="5.5" />
                  <path d="M12 36c0-8 4-13 10-13s9 4 11 10l4 6-4 3-5-6v12H12V36z" />
                  <rect x="34" y="34" width="18" height="8" rx="4" opacity="0.9" />
                  <rect x="36" y="44" width="18" height="8" rx="4" opacity="0.75" />
                </svg>
              )}
            </div>

            <form onSubmit={handleRegister} className="w-full space-y-2.5">
              <input
                type="text"
                maxLength={80}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                autoComplete="name"
                placeholder={
                  role === 'pengepul' ? 'Nama Penanggung Jawab' : 'Nama Lengkap'
                }
                className="w-full min-h-[42px] rounded-full border-2 border-[#3a7b42] bg-white/95 dark:bg-[#15211a] px-4 py-2 text-sm placeholder:text-[#55705c] focus:outline-none focus:ring-2 focus:ring-[#2eb547]"
              />

              {role === 'pengepul' && (
                <input
                  type="text"
                  maxLength={80}
                  value={usaha}
                  onChange={(e) => setUsaha(e.target.value)}
                  placeholder="Nama Usaha / Bank Sampah"
                  className="w-full min-h-[42px] rounded-full border-2 border-[#3a7b42] bg-white/95 dark:bg-[#15211a] px-4 py-2 text-sm placeholder:text-[#55705c] focus:outline-none focus:ring-2 focus:ring-[#2eb547]"
                />
              )}

              <input
                type="text"
                maxLength={200}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat / Area (Tembalang, Semarang)"
                className="w-full min-h-[42px] rounded-full border-2 border-[#3a7b42] bg-white/95 dark:bg-[#15211a] px-4 py-2 text-sm placeholder:text-[#55705c] focus:outline-none focus:ring-2 focus:ring-[#2eb547]"
              />

              <input
                type="email"
                readOnly
                value={pendingFirebaseUser.email || ''}
                aria-label="Email Google terdaftar"
                className="w-full min-h-[42px] rounded-full border-2 border-[#3a7b42]/50 bg-[#e9f7eb]/70 dark:bg-[#111d15] px-4 py-2 text-sm opacity-80 cursor-not-allowed"
              />

              <div className="grid grid-cols-5 gap-2">
                <select
                  aria-label="Bank atau e-wallet"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="col-span-2 min-h-[42px] rounded-full border-2 border-[#3a7b42] bg-white/95 dark:bg-[#15211a] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2eb547]"
                >
                  {BANK_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={rek}
                  onChange={(e) => setRek(e.target.value)}
                  placeholder="No Rekening (8–16 angka)"
                  className="col-span-3 min-h-[42px] rounded-full border-2 border-[#3a7b42] bg-white/95 dark:bg-[#15211a] px-4 py-2 text-sm font-mono-num placeholder:text-[#55705c] focus:outline-none focus:ring-2 focus:ring-[#2eb547]"
                />
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-48 min-h-[44px] rounded-full bg-[#4b8b42] hover:bg-[#3b7533] text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Masuk'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
