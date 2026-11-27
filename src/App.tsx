import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Home, User as UserIcon } from 'lucide-react';
import type {
  DeliverySettings,
  EcotingDB,
  Order,
  PengepulRatingRecord,
  Role,
  TopupRecord,
  User,
  Withdrawal,
} from './types/ecoting';
import {
  WASTE_CATEGORIES,
  formatRupiah,
  getOrderUnitPrice,
  loadDatabase,
  saveDatabase,
  seedDatabase,
} from './data/ecotingStore';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isQuotaExceededError,
} from './firebase';
import { usePWAInstall } from './hooks/usePWAInstall';
import { AuthView } from './components/AuthView';
import { CollectorDashboard } from './components/CollectorDashboard';
import { PengepulDashboard } from './components/PengepulDashboard';
import { AccountView } from './components/AccountView';
import {
  HistoryModal,
  OrderDetailModal,
  RatingModal,
  ReceiptModal,
} from './components/SharedModals';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type TabKey = 'home' | 'akun';

export default function App() {
  // Local demo fallback state
  const [demoDb, setDemoDb] = useState<EcotingDB>(() => loadDatabase());

  // Firebase Auth & Firestore cloud state
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<User | null>(null);
  const [cloudPengepul, setCloudPengepul] = useState<User[]>([]);
  const [cloudOrders, setCloudOrders] = useState<Order[]>([]);
  const [cloudRatings, setCloudRatings] = useState<PengepulRatingRecord[]>([]);
  const [cloudWithdrawals, setCloudWithdrawals] = useState<Withdrawal[]>([]);
  const [cloudTopups, setCloudTopups] = useState<TopupRecord[]>([]);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [tab, setTab] = useState<TabKey>('home');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { isInstalled } = usePWAInstall();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('ecoting_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('ecoting_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Modal states
  const [collectorModal, setCollectorModal] = useState<
    | 'none'
    | 'cari'
    | 'detailPengepul'
    | 's1'
    | 's3'
    | 'tarik'
    | 'laporan'
    | 'panduan'
  >('none');
  const [pengepulModal, setPengepulModal] = useState<
    'none' | 'kelola' | 'pengiriman' | 'isiSaldo' | 'buku' | 'verifikasi'
  >('none');
  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [receiptOrderId, setReceiptOrderId] = useState<number | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMsg]);

  const updateDemoDb = useCallback((updater: (prev: EcotingDB) => EcotingDB) => {
    setDemoDb((prev) => {
      const next = updater(prev);
      saveDatabase(next);
      return next;
    });
  }, []);

  // Re-throw Firestore errors into ErrorBoundary cleanly
  if (fatalError) {
    throw fatalError;
  }

  const handleSnapshotError = useCallback(
    (err: unknown, op: OperationType, path: string) => {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      try {
        handleFirestoreError(err, op, path);
      } catch (wrapped) {
        setFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
    [showToast],
  );

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);
      if (!fbUser) {
        setCloudProfile(null);
        setCloudPengepul([]);
        setCloudOrders([]);
        setCloudRatings([]);
        setCloudWithdrawals([]);
        setCloudTopups([]);
        setProfileLoading(false);
      } else {
        setProfileLoading(true);
      }
    });
    return unsub;
  }, []);

  // Listen to authenticated user's private profile
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const userPath = `users/${firebaseUser.uid}`;
    const unsub = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setCloudProfile({
            id: firebaseUser.uid,
            nama: String(d.nama || ''),
            usaha: typeof d.usaha === 'string' ? d.usaha : undefined,
            alamat: typeof d.alamat === 'string' ? d.alamat : '',
            email: String(d.email || firebaseUser.email || ''),
            pass: '',
            role: d.role === 'pengepul' ? 'pengepul' : 'pengumpul',
            saldo: 0,
            bank: String(d.bank || ''),
            rek: String(d.rek || ''),
          });
        } else {
          setCloudProfile(null);
        }
        setProfileLoading(false);
      },
      (err) => {
        setProfileLoading(false);
        handleSnapshotError(err, OperationType.GET, userPath);
      },
    );
    return unsub;
  }, [authReady, firebaseUser, handleSnapshotError]);

  // Listen to public Pengepul directory & Ratings once signed in & profiled
  useEffect(() => {
    if (!authReady || !firebaseUser || !cloudProfile) return;

    if (cloudProfile.role === 'pengepul') {
      void getDoc(doc(db, 'pengepul', firebaseUser.uid))
        .then((snap) => {
          if (snap.exists() && snap.data().isPublic !== true) {
            return updateDoc(doc(db, 'pengepul', firebaseUser.uid), {
              isPublic: true,
              updatedAt: serverTimestamp(),
            });
          }
        })
        .catch(() => {
          // handled via onSnapshot if needed
        });
    }

    const unsubPengepul = onSnapshot(
      query(collection(db, 'pengepul'), where('isPublic', '==', true)),
      (snap) => {
        const list: User[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          const cfg = d.pengiriman as DeliverySettings | undefined;
          return {
            id: docSnap.id,
            nama: String(d.picName || d.usaha || 'Pengepul'),
            usaha: String(d.usaha || ''),
            alamat: String(d.area || ''),
            area: String(d.area || ''),
            email: '',
            pass: '',
            role: 'pengepul',
            saldo: 0,
            bank: '',
            rek: '',
            harga: Array.isArray(d.harga)
              ? d.harga.map((n: unknown) => Number(n) || 0)
              : WASTE_CATEGORIES.map((c) => c.defaultPrice),
            jarak: typeof d.jarak === 'number' ? d.jarak : 1.0,
            rs: typeof d.rs === 'number' ? d.rs : 0,
            rn: typeof d.rn === 'number' ? d.rn : 0,
            pengiriman: cfg
              ? {
                  terimaAntar: Boolean(cfg.terimaAntar),
                  terimaJemput: Boolean(cfg.terimaJemput),
                  ongkirJemput: Number(cfg.ongkirJemput) || 0,
                  catatan:
                    typeof cfg.catatan === 'string' && cfg.catatan
                      ? cfg.catatan
                      : undefined,
                }
              : undefined,
          };
        });
        setCloudPengepul(list);
      },
      (err) => handleSnapshotError(err, OperationType.LIST, 'pengepul'),
    );

    const unsubRatings = onSnapshot(
      query(collection(db, 'ratings'), where('isPublic', '==', true)),
      (snap) => {
        const list: PengepulRatingRecord[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            pengepulId: String(d.pengepulId || ''),
            orderId: String(d.orderId || docSnap.id),
            by: String(d.by || ''),
            rate: Number(d.rate) || 0,
          };
        });
        setCloudRatings(list);
      },
      (err) => handleSnapshotError(err, OperationType.LIST, 'ratings'),
    );

    return () => {
      unsubPengepul();
      unsubRatings();
    };
  }, [authReady, firebaseUser, cloudProfile, handleSnapshotError]);

  // Listen to Orders & Withdrawals scoped strictly to current user
  useEffect(() => {
    if (!authReady || !firebaseUser || !cloudProfile) return;

    const filterField = cloudProfile.role === 'pengumpul' ? 'by' : 'to';
    const ordersQuery = query(
      collection(db, 'orders'),
      where(filterField, '==', firebaseUser.uid),
    );
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const list: Order[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: Number(d.orderNum) || Date.now(),
            docId: docSnap.id,
            by: String(d.by || ''),
            byName: typeof d.byName === 'string' ? d.byName : undefined,
            to: String(d.to || ''),
            toName: typeof d.toName === 'string' ? d.toName : undefined,
            jenis: String(d.jenis || ''),
            jid: Number(d.jid) || 0,
            berat: Number(d.berat) || 0,
            hrg: Number(d.hrg) || 0,
            est: Number(d.est) || 0,
            final: typeof d.final === 'number' ? d.final : undefined,
            total: typeof d.total === 'number' ? d.total : undefined,
            metode: d.metode === 'Dijemput' ? 'Dijemput' : 'Antar sendiri',
            alamat: String(d.alamat || ''),
            ongkir: Number(d.ongkir) || 0,
            status:
              d.status === 'Selesai' || d.status === 'Ditolak'
                ? d.status
                : 'Menunggu',
            tgl: String(d.tgl || ''),
            rate: typeof d.rate === 'number' ? d.rate : undefined,
          };
        });
        setCloudOrders(list);
      },
      (err) => handleSnapshotError(err, OperationType.LIST, 'orders'),
    );

    let unsubWithdrawals: (() => void) | undefined;
    let unsubTopups: (() => void) | undefined;

    if (cloudProfile.role === 'pengumpul') {
      const wdQuery = query(
        collection(db, 'withdrawals'),
        where('userId', '==', firebaseUser.uid),
      );
      unsubWithdrawals = onSnapshot(
        wdQuery,
        (snap) => {
          const list: Withdrawal[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              u: String(d.userId || ''),
              m: String(d.m || ''),
              n: Number(d.n) || 0,
              t: String(d.t || ''),
            };
          });
          setCloudWithdrawals(list);
        },
        (err) => handleSnapshotError(err, OperationType.LIST, 'withdrawals'),
      );
      setCloudTopups([]);
    } else {
      setCloudWithdrawals([]);
      const topupsQuery = query(
        collection(db, 'topups'),
        where('userId', '==', firebaseUser.uid),
      );
      unsubTopups = onSnapshot(
        topupsQuery,
        (snap) => {
          const list: TopupRecord[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              u: String(d.userId || ''),
              metode: String(d.metode || 'QRIS'),
              n: Number(d.n) || 0,
              t: String(d.t || ''),
            };
          });
          setCloudTopups(list);
        },
        (err) => handleSnapshotError(err, OperationType.LIST, 'topups'),
      );
    }

    return () => {
      unsubOrders();
      unsubWithdrawals?.();
      unsubTopups?.();
    };
  }, [authReady, firebaseUser, cloudProfile, handleSnapshotError]);

  const isCloudMode = Boolean(firebaseUser && cloudProfile);

  // Merge active profile & pengepul directory
  const activeUsers: User[] = useMemo(() => {
    if (!isCloudMode || !cloudProfile) return demoDb.users;
    const myStore = cloudPengepul.find((p) => p.id === cloudProfile.id);
    const enrichedSelf: User =
      cloudProfile.role === 'pengepul' && myStore
        ? {
            ...cloudProfile,
            harga: myStore.harga,
            jarak: myStore.jarak,
            rs: myStore.rs,
            rn: myStore.rn,
            pengiriman: myStore.pengiriman,
          }
        : cloudProfile;
    const others = cloudPengepul.filter((p) => p.id !== cloudProfile.id);
    return [enrichedSelf, ...others];
  }, [isCloudMode, cloudProfile, cloudPengepul, demoDb.users]);

  const activeOrders = isCloudMode ? cloudOrders : demoDb.orders;
  const activeWithdrawals = isCloudMode ? cloudWithdrawals : demoDb.wd;

  const currentUser = useMemo(() => {
    if (isCloudMode && cloudProfile) {
      const self =
        activeUsers.find((u) => u.id === cloudProfile.id) || cloudProfile;
      if (self.role === 'pengumpul') {
        const earned = cloudOrders
          .filter((o) => o.by === self.id && o.status === 'Selesai')
          .reduce((sum, o) => sum + Math.max(0, (o.total || 0) - o.ongkir), 0);
        const withdrawn = cloudWithdrawals.reduce((sum, w) => sum + w.n, 0);
        return { ...self, saldo: Math.max(0, earned - withdrawn) };
      }
      if (self.role === 'pengepul') {
        const topped = cloudTopups.reduce((sum, t) => sum + t.n, 0);
        const paidOut = cloudOrders
          .filter((o) => o.to === self.id && o.status === 'Selesai')
          .reduce((sum, o) => sum + Math.max(0, (o.total || 0) - o.ongkir), 0);
        return { ...self, saldo: Math.max(0, topped - paidOut) };
      }
      return self;
    }
    return demoDb.users.find((u) => u.id === demoDb.session) || null;
  }, [
    isCloudMode,
    cloudProfile,
    activeUsers,
    cloudOrders,
    cloudWithdrawals,
    cloudTopups,
    demoDb.users,
    demoDb.session,
  ]);

  const receiptOrder = useMemo(
    () => activeOrders.find((o) => o.id === receiptOrderId) || null,
    [activeOrders, receiptOrderId],
  );

  const ratingOrder = useMemo(
    () => activeOrders.find((o) => o.id === ratingOrderId) || null,
    [activeOrders, ratingOrderId],
  );

  // Auth handlers
  const handleGoogleSignIn = async () => {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (!cred.user.emailVerified) {
        showToast('Email Google Anda belum terverifikasi');
        await signOut(auth);
        return;
      }
      // Clear any local demo session when switching to real cloud auth
      updateDemoDb((prev) => ({ ...prev, session: null }));
      setTab('home');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        showToast('Masuk dibatalkan');
      } else if (code === 'auth/popup-blocked') {
        showToast('Popup diblokir browser. Izinkan popup lalu coba lagi.');
      } else if (code === 'auth/unauthorized-domain') {
        showToast('Domain ini belum terdaftar di Authorized Domains Firebase.');
      } else {
        showToast('Gagal masuk dengan Google. Coba lagi.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCancelGoogleOnboarding = async () => {
    await signOut(auth);
    showToast('Sesi dibatalkan');
  };

  const handleCompleteGoogleRegistration = async (profile: {
    role: Role;
    nama: string;
    alamat: string;
    bank: string;
    rek: string;
    usaha?: string;
  }) => {
    if (!firebaseUser || !firebaseUser.email) return;
    const uid = firebaseUser.uid;
    const batch = writeBatch(db);

    const userPayload: Record<string, unknown> = {
      uid,
      nama: profile.nama,
      role: profile.role,
      email: firebaseUser.email,
      alamat: profile.alamat,
      bank: profile.bank,
      rek: profile.rek,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (profile.role === 'pengepul' && profile.usaha) {
      userPayload.usaha = profile.usaha;
    }

    batch.set(doc(db, 'users', uid), userPayload);

    if (profile.role === 'pengepul') {
      batch.set(doc(db, 'pengepul', uid), {
        ownerId: uid,
        usaha: profile.usaha || profile.nama,
        picName: profile.nama,
        area: profile.alamat.slice(0, 100) || 'Tembalang, Semarang',
        harga: WASTE_CATEGORIES.map((c) => c.defaultPrice),
        jarak: +(0.5 + Math.random() * 2.5).toFixed(1),
        pengiriman: {
          terimaAntar: true,
          terimaJemput: true,
          ongkirJemput: 3000,
        },
        rs: 0,
        rn: 0,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      setTab('home');
      showToast(`Akun cloud aktif. Selamat datang, ${profile.nama}`);
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const handleDemoLogin = (userId: string) => {
    updateDemoDb((prev) => ({ ...prev, session: userId }));
    setTab('home');
  };

  const handleLogout = async () => {
    setCollectorModal('none');
    setPengepulModal('none');
    setHistoryOpen(false);
    setDetailOrder(null);
    setReceiptOrderId(null);
    setRatingOrderId(null);
    setVerifyingOrderId(null);
    if (firebaseUser) {
      await signOut(auth);
    }
    updateDemoDb((prev) => ({ ...prev, session: null }));
  };

  const handleResetDemo = () => {
    const fresh = seedDatabase();
    saveDatabase(fresh);
    setDemoDb(fresh);
    setTab('home');
    showToast('Data demo berhasil direset');
  };

  const handleSubmitOrders = async (newOrders: Order[]) => {
    if (!isCloudMode || !firebaseUser || !currentUser) {
      updateDemoDb((prev) => ({
        ...prev,
        orders: [...prev.orders, ...newOrders],
      }));
      return;
    }

    const batch = writeBatch(db);
    newOrders.forEach((o) => {
      const docId = `o_${o.id}`;
      batch.set(doc(db, 'orders', docId), {
        orderNum: Math.round(o.id),
        by: firebaseUser.uid,
        byName: (o.byName || currentUser.nama).slice(0, 80),
        to: o.to,
        toName: (o.toName || 'Pengepul').slice(0, 80),
        jenis: o.jenis.slice(0, 40),
        jid: Math.round(o.jid),
        berat: o.berat,
        hrg: o.hrg,
        est: o.est,
        metode: o.metode,
        alamat: (o.metode === 'Dijemput' ? o.alamat : '').slice(0, 200),
        ongkir: o.metode === 'Dijemput' ? o.ongkir : 0,
        status: 'Menunggu',
        tgl: o.tgl.slice(0, 30),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  };

  const handleWithdraw = async (amount: number) => {
    if (!currentUser) return;
    if (!isCloudMode || !firebaseUser) {
      updateDemoDb((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === currentUser.id ? { ...u, saldo: u.saldo - amount } : u,
        ),
        wd: [
          ...prev.wd,
          {
            u: currentUser.id,
            m: currentUser.bank,
            n: amount,
            t: new Date().toLocaleDateString('id-ID'),
          },
        ],
      }));
      showToast(`Penarikan ${formatRupiah(amount)} ke ${currentUser.bank} diproses`);
      return;
    }

    const wdId = `w_${Date.now()}`;
    try {
      await setDoc(doc(db, 'withdrawals', wdId), {
        userId: firebaseUser.uid,
        m: (currentUser.bank || 'BCA').slice(0, 40),
        rek: currentUser.rek,
        n: amount,
        t: new Date().toLocaleDateString('id-ID'),
        createdAt: serverTimestamp(),
      });
      showToast(`Penarikan ${formatRupiah(amount)} ke ${currentUser.bank} diproses`);
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(err, OperationType.CREATE, `withdrawals/${wdId}`);
    }
  };

  const handleRateOrder = async (orderId: number, stars: number) => {
    if (!isCloudMode || !firebaseUser) {
      updateDemoDb((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId ? { ...o, rate: stars } : o,
        ),
      }));
      setRatingOrderId(null);
      showToast('Terima kasih atas penilaianmu');
      return;
    }

    const target = activeOrders.find((o) => o.id === orderId);
    if (!target || !target.docId) return;

    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', target.docId), {
      rate: Math.round(stars),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'ratings', target.docId), {
      pengepulId: target.to,
      orderId: target.docId,
      by: firebaseUser.uid,
      rate: Math.round(stars),
      isPublic: true,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setRatingOrderId(null);
      showToast('Terima kasih atas penilaianmu');
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, `orders/${target.docId}`);
    }
  };

  const handleSavePengepulPrices = async (newPrices: number[]) => {
    if (!currentUser) return;
    if (!isCloudMode || !firebaseUser) {
      updateDemoDb((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === currentUser.id ? { ...u, harga: newPrices } : u,
        ),
      }));
      return;
    }

    try {
      await updateDoc(doc(db, 'pengepul', firebaseUser.uid), {
        harga: newPrices,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `pengepul/${firebaseUser.uid}`,
      );
    }
  };

  const handleSaveDeliverySettings = async (settings: DeliverySettings) => {
    if (!currentUser) return;
    if (!isCloudMode || !firebaseUser) {
      updateDemoDb((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === currentUser.id ? { ...u, pengiriman: settings } : u,
        ),
      }));
      return;
    }

    const cleanDelivery: Record<string, unknown> = {
      terimaAntar: Boolean(settings.terimaAntar),
      terimaJemput: Boolean(settings.terimaJemput),
      ongkirJemput: Math.max(0, Math.min(1000000, Number(settings.ongkirJemput) || 0)),
    };
    if (settings.catatan && settings.catatan.trim()) {
      cleanDelivery.catatan = settings.catatan.trim().slice(0, 140);
    }

    try {
      await updateDoc(doc(db, 'pengepul', firebaseUser.uid), {
        pengiriman: cleanDelivery,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `pengepul/${firebaseUser.uid}`,
      );
    }
  };

  const handleTopupSaldo = async (amount: number, metode: string) => {
    if (!currentUser) return;
    const cleanAmount = Math.round(amount);
    const cleanMetode = (metode || 'QRIS').trim().slice(0, 40) || 'QRIS';
    const today = new Date().toLocaleDateString('id-ID').slice(0, 30);

    if (!isCloudMode || !firebaseUser) {
      updateDemoDb((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === currentUser.id ? { ...u, saldo: u.saldo + cleanAmount } : u,
        ),
        topups: [
          ...(prev.topups || []),
          {
            u: currentUser.id,
            metode: cleanMetode,
            n: cleanAmount,
            t: today,
          },
        ],
      }));
      showToast(`Saldo Eco-Pay bertambah ${formatRupiah(cleanAmount)}`);
      return;
    }

    const topupId = `t_${Date.now()}`;
    try {
      await setDoc(doc(db, 'topups', topupId), {
        userId: firebaseUser.uid,
        metode: cleanMetode,
        n: cleanAmount,
        t: today,
        createdAt: serverTimestamp(),
      });
      showToast(`Saldo Eco-Pay bertambah ${formatRupiah(cleanAmount)}`);
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(err, OperationType.CREATE, `topups/${topupId}`);
    }
  };

  const handleApproveOrder = async (orderId: number, finalWeight: number) => {
    const target = activeOrders.find((o) => o.id === orderId);
    if (!target) return;
    const total = finalWeight * getOrderUnitPrice(target);
    const credit = Math.max(0, total - target.ongkir);

    if (currentUser?.role === 'pengepul' && credit > currentUser.saldo) {
      showToast('Saldo Eco-Pay belum cukup. Silakan isi saldo terlebih dahulu.');
      return;
    }

    if (!isCloudMode || !firebaseUser) {
      updateDemoDb((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId
            ? { ...o, final: finalWeight, total, status: 'Selesai' }
            : o,
        ),
        users: prev.users.map((u) => {
          if (u.id === target.by) return { ...u, saldo: u.saldo + credit };
          if (u.id === target.to) {
            return { ...u, saldo: Math.max(0, u.saldo - credit) };
          }
          return u;
        }),
      }));
      showToast('Pembayaran Berhasil');
      return;
    }

    if (!target.docId) return;
    try {
      await updateDoc(doc(db, 'orders', target.docId), {
        status: 'Selesai',
        final: finalWeight,
        total,
        updatedAt: serverTimestamp(),
      });
      showToast('Pembayaran Berhasil');
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(err, OperationType.UPDATE, `orders/${target.docId}`);
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    if (!isCloudMode || !firebaseUser) {
      updateDemoDb((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId ? { ...o, status: 'Ditolak' } : o,
        ),
      }));
      showToast('Setoran ditolak');
      return;
    }

    const target = activeOrders.find((o) => o.id === orderId);
    if (!target || !target.docId) return;
    try {
      await updateDoc(doc(db, 'orders', target.docId), {
        status: 'Ditolak',
        updatedAt: serverTimestamp(),
      });
      showToast('Setoran ditolak');
    } catch (err) {
      if (isQuotaExceededError(err)) {
        showToast('Kuota harian database tercapai. Silakan coba lagi besok.');
        return;
      }
      handleFirestoreError(err, OperationType.UPDATE, `orders/${target.docId}`);
    }
  };

  const handlePrimaryNavAction = () => {
    setTab('home');
    if (currentUser?.role === 'pengumpul') {
      setCollectorModal('cari');
    } else {
      setPengepulModal('verifikasi');
    }
  };

  const pendingOnboardingUser =
    authReady && firebaseUser && !profileLoading && !cloudProfile
      ? firebaseUser
      : null;

  return (
    <div className="min-h-screen bg-[#f4f9f4] dark:bg-[#0c1510] text-[#102916] dark:text-[#e8f3ec]">
      {/* Dark Pill Toast Notification matching Figma Screenshot 1 ("Pembayaran Berhasil") */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] rounded-full bg-[#111913] text-white px-5 py-2.5 text-xs md:text-sm font-bold shadow-xl"
        >
          {toastMsg}
        </div>
      )}

      {!authReady || (firebaseUser && profileLoading) ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-sm border border-[#d6ecd8] flex items-center justify-center">
            <img
              src="/ecoting-logo.png"
              alt="ECO-TING"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-xs font-bold text-[#2c5232] dark:text-[#9fc2a7]">
            Menghubungkan ke ECO-TING Cloud...
          </p>
        </div>
      ) : !currentUser ? (
        <AuthView
          users={demoDb.users}
          pendingFirebaseUser={pendingOnboardingUser}
          authBusy={authBusy}
          onGoogleSignIn={handleGoogleSignIn}
          onCancelGoogleOnboarding={handleCancelGoogleOnboarding}
          onCompleteGoogleRegistration={handleCompleteGoogleRegistration}
          onDemoLogin={handleDemoLogin}
          onToast={showToast}
        />
      ) : (
        <>
          {/* Desktop 3-Zone Top Bar */}
          <header className="hidden md:block sticky top-0 z-30 bg-[#24c23b] dark:bg-[#126825] text-white shadow-xs">
            <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-8">
              <button
                type="button"
                onClick={() => setTab('home')}
                className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
              >
                ECO-TING
              </button>

              <nav className="flex items-center gap-6 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setTab('home')}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    tab === 'home'
                      ? 'border-white text-white'
                      : 'border-transparent text-white/80 hover:text-white'
                  }`}
                >
                  Beranda
                </button>
                <button
                  type="button"
                  onClick={handlePrimaryNavAction}
                  className="py-1 border-b-2 border-transparent text-white/80 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  {currentUser.role === 'pengumpul' ? 'Setor' : 'Verifikasi'}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="py-1 border-b-2 border-transparent text-white/80 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Riwayat
                </button>
                <button
                  type="button"
                  onClick={() => setTab('akun')}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    tab === 'akun'
                      ? 'border-white text-white'
                      : 'border-transparent text-white/80 hover:text-white'
                  }`}
                >
                  Akun
                </button>
              </nav>

              <div className="shrink-0">
                {!isInstalled ? (
                  <PWAInstallButton variant="compact" onInstalledToast={showToast} />
                ) : (
                  <button
                    type="button"
                    onClick={handlePrimaryNavAction}
                    className="min-h-[38px] rounded-full bg-white text-[#0f7a35] px-4 py-1.5 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0"
                  >
                    {currentUser.role === 'pengumpul' ? 'Setor sampah' : 'Verifikasi'}
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Mobile Compact Top App Bar (48px) matching Figma vivid green strip */}
          <header className="md:hidden sticky top-0 z-30 h-12 bg-[#24c23b] dark:bg-[#126825] text-white px-4 flex items-center justify-between gap-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setTab('home')}
              className="text-base font-extrabold tracking-tight text-white whitespace-nowrap"
            >
              ECO-TING
            </button>
            <PWAInstallButton variant="compact" onInstalledToast={showToast} />
          </header>

          {/* Main Content */}
          <main className="max-w-5xl mx-auto px-3.5 md:px-6 pt-4 pb-24 md:py-7">
            {tab === 'akun' ? (
              <AccountView
                user={currentUser}
                isCloudMode={isCloudMode}
                theme={theme}
                onToggleTheme={() =>
                  setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
                }
                onResetDemo={handleResetDemo}
                onLogout={handleLogout}
                onToast={showToast}
              />
            ) : currentUser.role === 'pengumpul' ? (
              <CollectorDashboard
                user={currentUser}
                users={activeUsers}
                orders={activeOrders}
                ratings={isCloudMode ? cloudRatings : undefined}
                activeModal={collectorModal}
                setActiveModal={setCollectorModal}
                onOpenHistory={() => setHistoryOpen(true)}
                onOpenReceipt={(id) => setReceiptOrderId(id)}
                onOpenRate={(id) => setRatingOrderId(id)}
                onOpenDetail={(order) => setDetailOrder(order)}
                onSubmitOrders={handleSubmitOrders}
                onWithdraw={handleWithdraw}
                onToast={showToast}
              />
            ) : (
              <PengepulDashboard
                user={currentUser}
                users={activeUsers}
                orders={activeOrders}
                ratings={isCloudMode ? cloudRatings : undefined}
                topups={
                  isCloudMode
                    ? cloudTopups
                    : (demoDb.topups || []).filter((t) => t.u === currentUser.id)
                }
                activeModal={pengepulModal}
                setActiveModal={setPengepulModal}
                verifyingOrderId={verifyingOrderId}
                setVerifyingOrderId={setVerifyingOrderId}
                onOpenHistory={() => setHistoryOpen(true)}
                onOpenReceipt={(id) => setReceiptOrderId(id)}
                onSavePrices={handleSavePengepulPrices}
                onSaveDeliverySettings={handleSaveDeliverySettings}
                onTopupSaldo={handleTopupSaldo}
                onApproveOrder={handleApproveOrder}
                onRejectOrder={handleRejectOrder}
                onToast={showToast}
              />
            )}
          </main>

          {/* Mobile Vivid Green Fixed Bottom Navigation Bar matching Figma (Beranda left, Akun right) */}
          <nav
            aria-label="Navigasi utama"
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#24c23b] dark:bg-[#126825] text-white flex items-center justify-between px-10 h-[58px] pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
          >
            <button
              type="button"
              onClick={() => setTab('home')}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-opacity ${
                tab === 'home' ? 'opacity-100' : 'opacity-75'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Beranda</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('akun')}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-opacity ${
                tab === 'akun' ? 'opacity-100' : 'opacity-75'
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span>Akun</span>
            </button>
          </nav>

          {/* Shared Modals */}
          <HistoryModal
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            user={currentUser}
            users={activeUsers}
            orders={activeOrders}
            withdrawals={activeWithdrawals}
            onOpenReceipt={(id) => {
              setHistoryOpen(false);
              setReceiptOrderId(id);
            }}
            onOpenRate={(id) => {
              setHistoryOpen(false);
              setRatingOrderId(id);
            }}
            onOpenDetail={(order) => {
              setHistoryOpen(false);
              setDetailOrder(order);
            }}
          />

          <OrderDetailModal
            order={detailOrder}
            users={activeUsers}
            onClose={() => setDetailOrder(null)}
            onOpenReceipt={(id) => setReceiptOrderId(id)}
          />

          <ReceiptModal
            order={receiptOrder}
            users={activeUsers}
            onClose={() => setReceiptOrderId(null)}
          />

          <RatingModal
            order={ratingOrder}
            users={activeUsers}
            onRate={handleRateOrder}
            onClose={() => setRatingOrderId(null)}
          />
        </>
      )}

      <OfflineIndicator />
    </div>
  );
}
