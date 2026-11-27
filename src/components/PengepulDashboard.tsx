import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Star,
  Leaf,
  Wallet,
  Truck,
  Footprints,
  PlusCircle,
  MapPin,
} from 'lucide-react';
import type {
  DeliverySettings,
  LedgerAccountKey,
  LedgerEntry,
  Order,
  PengepulRatingRecord,
  TopupRecord,
  User,
} from '../types/ecoting';
import {
  WASTE_CATEGORIES,
  formatDeliverySummary,
  formatRupiah,
  getDeliverySettings,
  getDisplayName,
  getOrderUnitPrice,
  getPengepulRating,
  getUserDisplayName,
  getUserOrders,
} from '../data/ecotingStore';
import { DrawerModal } from './DrawerModal';
import { OrderCard } from './OrderCard';

const TOPUP_METHODS = [
  'QRIS',
  'Transfer BCA',
  'Transfer BRI',
  'Transfer Mandiri',
  'Transfer BNI',
  'DANA',
  'GoPay',
  'OVO',
] as const;

const TOPUP_PRESETS = [50000, 100000, 250000, 500000] as const;

interface PengepulDashboardProps {
  user: User;
  users: User[];
  orders: Order[];
  ratings?: PengepulRatingRecord[];
  topups?: TopupRecord[];
  activeModal:
    | 'none'
    | 'kelola'
    | 'pengiriman'
    | 'isiSaldo'
    | 'buku'
    | 'verifikasi';
  setActiveModal: (
    modal:
      | 'none'
      | 'kelola'
      | 'pengiriman'
      | 'isiSaldo'
      | 'buku'
      | 'verifikasi',
  ) => void;
  verifyingOrderId: number | null;
  setVerifyingOrderId: (id: number | null) => void;
  onOpenHistory: () => void;
  onOpenReceipt: (orderId: number) => void;
  onSavePrices: (newPrices: number[]) => void;
  onSaveDeliverySettings: (settings: DeliverySettings) => void;
  onTopupSaldo: (amount: number, metode: string) => void | Promise<void>;
  onApproveOrder: (orderId: number, finalWeight: number) => void;
  onRejectOrder: (orderId: number) => void;
  onToast: (msg: string) => void;
}

const LEDGER_ACCOUNTS: Record<
  LedgerAccountKey,
  { name: string; code: string; normal: 'D' | 'K' }
> = {
  Persediaan: { name: 'Persediaan Sampah', code: '1-101', normal: 'D' },
  Kas: { name: 'Kas', code: '1-100', normal: 'D' },
  Jemput: { name: 'Pendapatan Jasa Jemput', code: '4-101', normal: 'K' },
};

export const PengepulDashboard: React.FC<PengepulDashboardProps> = ({
  user,
  users,
  orders,
  ratings,
  topups = [],
  activeModal,
  setActiveModal,
  verifyingOrderId,
  setVerifyingOrderId,
  onOpenHistory,
  onOpenReceipt,
  onSavePrices,
  onSaveDeliverySettings,
  onTopupSaldo,
  onApproveOrder,
  onRejectOrder,
  onToast,
}) => {
  const myOrders = useMemo(() => getUserOrders(orders, user), [orders, user]);
  const waitingOrders = useMemo(
    () => myOrders.filter((o) => o.status === 'Menunggu'),
    [myOrders],
  );
  const doneOrders = useMemo(
    () => myOrders.filter((o) => o.status === 'Selesai'),
    [myOrders],
  );
  const totalKg = useMemo(
    () => doneOrders.reduce((acc, o) => acc + (o.final || 0), 0),
    [doneOrders],
  );
  const totalPaid = useMemo(
    () => doneOrders.reduce((acc, o) => acc + ((o.total || 0) - o.ongkir), 0),
    [doneOrders],
  );
  const rating = useMemo(
    () => getPengepulRating(user, orders, ratings),
    [user, orders, ratings],
  );

  // Kelola Harga state
  const [enabledCats, setEnabledCats] = useState<boolean[]>([]);
  const [priceInputs, setPriceInputs] = useState<string[]>([]);

  useEffect(() => {
    if (activeModal === 'kelola') {
      const prices = user.harga || WASTE_CATEGORIES.map((c) => c.defaultPrice);
      setEnabledCats(WASTE_CATEGORIES.map((_, idx) => (prices[idx] || 0) > 0));
      setPriceInputs(
        WASTE_CATEGORIES.map((cat, idx) =>
          String((prices[idx] || 0) > 0 ? prices[idx] : cat.defaultPrice),
        ),
      );
    }
  }, [activeModal, user]);

  // Opsi Pengiriman state
  const currentDelivery = useMemo(() => getDeliverySettings(user), [user]);
  const [terimaAntar, setTerimaAntar] = useState(true);
  const [terimaJemput, setTerimaJemput] = useState(true);
  const [ongkirInput, setOngkirInput] = useState('3000');
  const [catatanInput, setCatatanInput] = useState('');

  useEffect(() => {
    if (activeModal === 'pengiriman') {
      const cfg = getDeliverySettings(user);
      setTerimaAntar(cfg.terimaAntar);
      setTerimaJemput(cfg.terimaJemput);
      setOngkirInput(String(cfg.ongkirJemput));
      setCatatanInput(cfg.catatan || '');
    }
  }, [activeModal, user]);

  // Isi Saldo state
  const [topupAmount, setTopupAmount] = useState('100000');
  const [topupMethod, setTopupMethod] = useState<string>('QRIS');
  const [topupSubmitting, setTopupSubmitting] = useState(false);

  // Verifikasi single order
  const verifyingOrder = useMemo(
    () => orders.find((o) => o.id === verifyingOrderId) || null,
    [orders, verifyingOrderId],
  );
  const [weighedKg, setWeighedKg] = useState('');

  useEffect(() => {
    if (verifyingOrder) {
      setWeighedKg(String(verifyingOrder.berat));
    }
  }, [verifyingOrder]);

  const netPayForVerifying = useMemo(() => {
    if (!verifyingOrder) return 0;
    const weight = parseFloat(weighedKg) || 0;
    return Math.max(
      0,
      weight * getOrderUnitPrice(verifyingOrder) - verifyingOrder.ongkir,
    );
  }, [verifyingOrder, weighedKg]);

  const insufficientBalance = verifyingOrder
    ? netPayForVerifying > user.saldo
    : false;

  const [ledgerTab, setLedgerTab] = useState<LedgerAccountKey>('Persediaan');

  const ledgerData = useMemo(() => {
    const sortedDone = [...doneOrders].sort((a, b) => a.id - b.id);
    const entries: Record<LedgerAccountKey, LedgerEntry[]> = {
      Persediaan: [],
      Kas: [],
      Jemput: [],
    };

    sortedDone.forEach((o) => {
      const bukti = 'ET-' + String(o.id).slice(-6);
      const collectorName = getUserDisplayName(users, o.by, o.byName);
      const total = o.total || 0;
      const finalWeight = o.final || o.berat;

      entries.Persediaan.push({
        t: o.tgl,
        b: bukti,
        k: `Beli ${o.jenis} ${finalWeight} kg dari ${collectorName}`,
        d: total,
        c: 0,
      });

      entries.Kas.push({
        t: o.tgl,
        b: bukti,
        k: `Bayar ${collectorName}`,
        d: 0,
        c: total - o.ongkir,
      });

      if (o.ongkir > 0) {
        entries.Jemput.push({
          t: o.tgl,
          b: bukti,
          k: `Ongkir jemput ${collectorName}`,
          d: 0,
          c: o.ongkir,
        });
      }
    });

    let allDebit = 0;
    let allCredit = 0;
    (Object.keys(entries) as LedgerAccountKey[]).forEach((key) => {
      entries[key].forEach((r) => {
        allDebit += r.d;
        allCredit += r.c;
      });
    });

    return { entries, allDebit, allCredit };
  }, [doneOrders, users]);

  const handleSaveKelola = () => {
    const updated: number[] = [];
    let activeCount = 0;
    for (let i = 0; i < WASTE_CATEGORIES.length; i++) {
      const on = enabledCats[i];
      const val = parseInt(priceInputs[i] || '0', 10);
      if (on && !(val > 0)) {
        onToast(`Isi harga untuk ${WASTE_CATEGORIES[i].name}`);
        return;
      }
      updated.push(on ? val : 0);
      if (on) activeCount++;
    }
    onSavePrices(updated);
    setActiveModal('none');
    onToast(
      activeCount
        ? `${activeCount} jenis sampah aktif. Harga disimpan`
        : 'Semua jenis dinonaktifkan',
    );
  };

  const handleSaveDelivery = () => {
    if (!terimaAntar && !terimaJemput) {
      onToast('Aktifkan minimal satu opsi pengiriman');
      return;
    }
    const parsedOngkir =
      ongkirInput.trim() === '' ? 0 : parseInt(ongkirInput, 10);
    if (terimaJemput && (Number.isNaN(parsedOngkir) || parsedOngkir < 0)) {
      onToast('Tarif ongkir jemput tidak valid');
      return;
    }

    const nextSettings: DeliverySettings = {
      terimaAntar,
      terimaJemput,
      ongkirJemput: terimaJemput ? parsedOngkir : currentDelivery.ongkirJemput,
      catatan: catatanInput.trim() || undefined,
    };

    onSaveDeliverySettings(nextSettings);
    setActiveModal('none');
    onToast('Opsi pengiriman berhasil disimpan');
  };

  const handleConfirmTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = Math.round(Number(topupAmount) || 0);
    if (nominal < 10000) {
      onToast('Minimal isi saldo Rp10.000');
      return;
    }
    if (nominal > 100000000) {
      onToast('Maksimal isi saldo Rp100.000.000 per transaksi');
      return;
    }
    if (topupSubmitting) return;
    setTopupSubmitting(true);
    try {
      await onTopupSaldo(nominal, topupMethod);
      setActiveModal('none');
    } finally {
      setTopupSubmitting(false);
    }
  };

  const handleApprove = () => {
    if (!verifyingOrder) return;
    const weight = parseFloat(weighedKg);
    if (!(weight > 0)) {
      onToast('Isi berat hasil timbang');
      return;
    }
    if (netPayForVerifying > user.saldo) {
      onToast('Saldo Eco-Pay belum cukup. Silakan isi saldo terlebih dahulu.');
      return;
    }
    onApproveOrder(verifyingOrder.id, weight);
    setVerifyingOrderId(null);
  };

  const handleReject = () => {
    if (!verifyingOrder) return;
    onRejectOrder(verifyingOrder.id);
    setVerifyingOrderId(null);
  };

  const currentAccount = LEDGER_ACCOUNTS[ledgerTab];
  const currentRows = ledgerData.entries[ledgerTab];
  let runningBalance = 0;
  let sumDebit = 0;
  let sumCredit = 0;
  const computedRows = currentRows.map((row) => {
    sumDebit += row.d;
    sumCredit += row.c;
    runningBalance =
      currentAccount.normal === 'D'
        ? runningBalance + row.d - row.c
        : runningBalance + row.c - row.d;
    return { ...row, balance: runningBalance };
  });

  const isBalanced = Math.abs(ledgerData.allDebit - ledgerData.allCredit) < 1;

  return (
    <div className="space-y-6">
      {/* Sage-Green Pengepul Workspace Container matching Figma Screenshot 4 */}
      <section className="rounded-3xl bg-[#9ec89b] dark:bg-[#15281a] border border-[#6ca068] dark:border-[#243d2a] p-4 md:p-6 space-y-5 shadow-sm">
        {/* Top Saldo / Business Card matching Figma */}
        <div className="rounded-2xl bg-[#eef3ed] dark:bg-[#1b3121] border border-[#c8dac6] dark:border-[#2d4d35] p-4 md:p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#2e5233] dark:text-[#9fc2a7]">
                {getDisplayName(user)} ·{' '}
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                  <span className="font-mono-num">
                    {rating.count > 0 ? rating.avg.toFixed(1) : 'Baru'}
                  </span>
                </span>
              </p>
              <p className="text-[11px] font-semibold text-[#4b6e50] dark:text-[#8eb096] mt-2">
                Saldo Eco-Pay
              </p>
              <h1 className="font-mono-num text-2xl md:text-3xl font-extrabold text-[#0c2612] dark:text-white mt-0.5">
                {formatRupiah(user.saldo)}
              </h1>
              <p className="text-[11px] text-[#4b6e50] dark:text-[#8eb096] mt-1 font-mono-num">
                Total pembelian: {formatRupiah(totalPaid)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-2xs flex items-center justify-center">
                <img
                  src="/ecoting-logo.png"
                  alt="ECO-TING"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveModal('isiSaldo')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#24c23b] hover:bg-[#1ca931] px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-2xs transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Isi Saldo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('buku')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#15211a] border border-[#6ca068] px-3 py-1.5 text-[11px] font-bold text-[#102916] dark:text-[#e8f3ec]"
                >
                  <Wallet className="w-3 h-3 text-[#0f7a35]" />
                  <span>Buku Kas</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2x2 Large Light Cards Grid matching Figma */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setActiveModal('kelola')}
            className="min-h-[116px] rounded-2xl bg-[#eef3ed] dark:bg-[#1b3121] hover:bg-white dark:hover:bg-[#233d29] border border-[#c8dac6] dark:border-[#2d4d35] p-4 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <span className="text-xs md:text-sm font-extrabold tracking-wide text-[#102916] dark:text-white uppercase leading-snug">
              KELOLA HARGA
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('verifikasi')}
            className="min-h-[116px] rounded-2xl bg-[#eef3ed] dark:bg-[#1b3121] hover:bg-white dark:hover:bg-[#233d29] border border-[#c8dac6] dark:border-[#2d4d35] p-4 flex flex-col items-center justify-center text-center shadow-2xs transition-colors relative"
          >
            {waitingOrders.length > 0 && (
              <span className="absolute top-3 right-3 font-mono-num min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#c95b53] text-white text-xs font-extrabold flex items-center justify-center">
                {waitingOrders.length}
              </span>
            )}
            <span className="text-xs md:text-sm font-extrabold tracking-wide text-[#102916] dark:text-white uppercase leading-snug">
              VERIFIKASI
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="min-h-[116px] rounded-2xl bg-[#eef3ed] dark:bg-[#1b3121] hover:bg-white dark:hover:bg-[#233d29] border border-[#c8dac6] dark:border-[#2d4d35] p-4 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <span className="text-xs md:text-sm font-extrabold tracking-wide text-[#102916] dark:text-white uppercase leading-snug">
              RIWAYAT
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('buku')}
            className="min-h-[116px] rounded-2xl bg-[#eef3ed] dark:bg-[#1b3121] hover:bg-white dark:hover:bg-[#233d29] border border-[#c8dac6] dark:border-[#2d4d35] p-4 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <span className="text-xs md:text-sm font-extrabold tracking-wide text-[#102916] dark:text-white uppercase leading-snug">
              BUKU BESAR
            </span>
          </button>
        </div>

        {/* Opsi Pengiriman Bar */}
        <div className="rounded-2xl bg-[#eef3ed] dark:bg-[#1b3121] border border-[#c8dac6] dark:border-[#2d4d35] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#15211a] border border-[#6ca068]/60 flex items-center justify-center text-[#0f7a35] dark:text-[#6ee7a0] shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#102916] dark:text-white">
                Opsi Pengiriman
              </p>
              <p className="text-[11px] font-semibold text-[#3a5c3f] dark:text-[#93a89b] truncate">
                {formatDeliverySummary(user)}
              </p>
              {currentDelivery.catatan && (
                <p className="text-[11px] text-[#4b6e50] dark:text-[#8eb096] truncate">
                  {currentDelivery.catatan}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('pengiriman')}
            className="min-h-[38px] rounded-full bg-[#4b8b42] hover:bg-[#3b7533] text-white px-4 py-1.5 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0"
          >
            Atur Pengiriman
          </button>
        </div>

        {/* 3 Stat Pills matching Figma */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-[#eef3ed]/90 dark:bg-[#1b3121] py-2.5 px-2 text-center">
            <p className="font-mono-num text-base font-extrabold text-[#102916] dark:text-[#6ee7a0]">
              {waitingOrders.length}
            </p>
            <p className="text-[11px] font-semibold text-[#3a5c3f] dark:text-[#93a89b]">
              menunggu
            </p>
          </div>
          <div className="rounded-xl bg-[#eef3ed]/90 dark:bg-[#1b3121] py-2.5 px-2 text-center">
            <p className="font-mono-num text-base font-extrabold text-[#102916] dark:text-[#6ee7a0]">
              {totalKg.toFixed(1)}
            </p>
            <p className="text-[11px] font-semibold text-[#3a5c3f] dark:text-[#93a89b]">
              kg masuk
            </p>
          </div>
          <div className="rounded-xl bg-[#eef3ed]/90 dark:bg-[#1b3121] py-2.5 px-2 text-center">
            <p className="font-mono-num text-base font-extrabold text-[#102916] dark:text-[#6ee7a0]">
              {doneOrders.length}
            </p>
            <p className="text-[11px] font-semibold text-[#3a5c3f] dark:text-[#93a89b]">
              selesai
            </p>
          </div>
        </div>

        {/* Dark Forest Green Bottom Banner matching Figma */}
        <div className="rounded-2xl bg-[#0a4619] text-white p-4 flex items-center gap-3.5">
          <Leaf className="w-6 h-6 text-[#6ee7a0] shrink-0" />
          <div className="text-xs">
            <p className="font-extrabold text-sm">Dukung Net Zero Waste</p>
            <p className="text-emerald-100/85 mt-0.5">
              Setiap pembelian membantu sampah Tembalang kembali ke daur ulang.
            </p>
          </div>
        </div>
      </section>

      {/* Inline Pending Orders Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold">Antrean verifikasi pembelian</h2>
          {doneOrders.length > 0 && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-xs font-bold text-[#0f7a35] dark:text-[#6ee7a0] hover:underline"
            >
              Riwayat selesai
            </button>
          )}
        </div>

        {waitingOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {waitingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                users={users}
                isCollectorView={false}
                onOpenReceipt={onOpenReceipt}
                onOpenVerify={(id) => setVerifyingOrderId(id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#15211a] border border-[#dce6dc] dark:border-[#243329] p-6 text-center text-xs text-[#5f7367] dark:text-[#93a89b]">
            Tidak ada pembelian yang perlu diverifikasi saat ini.
          </div>
        )}
      </section>

      {/* Modal: Kelola Harga (Figma Screenshot 4, Bottom Screen 2) */}
      <DrawerModal
        open={activeModal === 'kelola'}
        onClose={() => setActiveModal('none')}
        title="Kelola Harga"
        subtitle="Aktifkan jenis sampah yang akan diterima dan tetapkan harga beli per kg."
      >
        <div className="space-y-3">
          {WASTE_CATEGORIES.map((cat, idx) => {
            const isChecked = enabledCats[idx] ?? false;
            return (
              <div
                key={cat.id}
                className="rounded-full bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#5f8f5b]/50 px-4 py-2.5 flex items-center justify-between gap-2"
              >
                <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const next = [...enabledCats];
                      next[idx] = e.target.checked;
                      setEnabledCats(next);
                    }}
                    className="w-4 h-4 accent-[#0f7a35] rounded shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-bold truncate">
                    {cat.name}
                  </span>
                </label>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="1"
                    step="100"
                    disabled={!isChecked}
                    aria-label={`Harga ${cat.name} per kg`}
                    value={priceInputs[idx] || ''}
                    onChange={(e) => {
                      const next = [...priceInputs];
                      next[idx] = e.target.value;
                      setPriceInputs(next);
                    }}
                    className="w-24 min-h-[36px] rounded-full border border-[#4d7c49] bg-white dark:bg-[#15211a] px-3 py-1 text-xs font-mono-num text-center disabled:opacity-45"
                  />
                  <span className="text-xs font-semibold">/kg</span>
                </div>
              </div>
            );
          })}

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleSaveKelola}
              className="w-56 min-h-[44px] rounded-full bg-[#4b8b42] hover:bg-[#3b7533] text-white font-extrabold text-sm transition-colors"
            >
              Simpan perubahan
            </button>
          </div>
        </div>
      </DrawerModal>

      {/* Modal: Opsi Pengiriman */}
      <DrawerModal
        open={activeModal === 'pengiriman'}
        onClose={() => setActiveModal('none')}
        title="Opsi Pengiriman"
        subtitle="Atur metode pengiriman yang tersedia untuk pengumpul serta tarif penjemputan."
        maxWidthClass="md:max-w-md"
      >
        <div className="space-y-3.5">
          <label className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#5f8f5b]/60 p-3.5 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={terimaAntar}
              onChange={(e) => setTerimaAntar(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#0f7a35] rounded shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-[#0f7a35] dark:text-[#6ee7a0]" />
                <span className="text-sm font-extrabold">
                  Antar Sendiri (Drop-off)
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                Pengumpul mengantar sampah langsung ke lokasi pengepul tanpa biaya ongkir.
              </p>
            </div>
          </label>

          <div className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#5f8f5b]/60 p-3.5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={terimaJemput}
                onChange={(e) => setTerimaJemput(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#0f7a35] rounded shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#0f7a35] dark:text-[#6ee7a0]" />
                  <span className="text-sm font-extrabold">
                    Dijemput Kurir (Pick-up)
                  </span>
                </div>
                <p className="text-xs opacity-80 mt-0.5">
                  Pengepul menjemput sampah ke alamat pengumpul dengan tarif ongkir per transaksi.
                </p>
              </div>
            </label>

            <div className="pl-7 space-y-1">
              <label
                htmlFor="ongkir-jemput-input"
                className="block text-xs font-bold"
              >
                Tarif ongkir jemput (Rp)
              </label>
              <input
                id="ongkir-jemput-input"
                type="number"
                min="0"
                step="500"
                disabled={!terimaJemput}
                value={ongkirInput}
                onChange={(e) => setOngkirInput(e.target.value)}
                className="w-full min-h-[40px] rounded-full border border-[#4d7c49] bg-white dark:bg-[#15211a] px-4 py-1.5 text-sm font-mono-num disabled:opacity-45 focus:outline-2 focus:outline-[#0f7a35]"
              />
              <p className="text-[11px] opacity-75">
                Isi 0 untuk memberikan layanan gratis ongkir jemput.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="catatan-pengiriman-input"
              className="block text-xs font-bold mb-1.5"
            >
              Catatan / jadwal pengambilan (opsional)
            </label>
            <input
              id="catatan-pengiriman-input"
              type="text"
              value={catatanInput}
              onChange={(e) => setCatatanInput(e.target.value)}
              placeholder="Contoh: Senin–Sabtu 08.00–17.00 · Area Tembalang"
              className="w-full min-h-[42px] rounded-xl border border-[#4d7c49] bg-[#e9f1e8] dark:bg-[#15211a] px-3.5 py-2 text-xs sm:text-sm focus:outline-2 focus:outline-[#0f7a35]"
            />
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleSaveDelivery}
              className="w-60 min-h-[44px] rounded-full bg-[#4b8b42] hover:bg-[#3b7533] text-white font-extrabold text-sm transition-colors"
            >
              Simpan opsi pengiriman
            </button>
          </div>
        </div>
      </DrawerModal>

      {/* Modal: Verifikasi Pembelian (Figma Screenshot 4, Bottom Screen 3) */}
      <DrawerModal
        open={activeModal === 'verifikasi'}
        onClose={() => setActiveModal('none')}
        title="Verifikasi Pembelian"
        subtitle="Timbang sampah yang masuk, lalu terima atau tolak."
      >
        <div className="space-y-3">
          {waitingOrders.length > 0 ? (
            waitingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                users={users}
                isCollectorView={false}
                onOpenReceipt={onOpenReceipt}
                onOpenVerify={(id) => {
                  setActiveModal('none');
                  setVerifyingOrderId(id);
                }}
              />
            ))
          ) : (
            <p className="py-10 text-center text-sm opacity-75">
              Tidak ada pembelian yang perlu diverifikasi.
            </p>
          )}
        </div>
      </DrawerModal>

      {/* Modal: Verifikasi Sampah (Figma Screenshot 4 Bottom Screen 4 & Screenshot 1 Bottom Screen 2) */}
      <DrawerModal
        open={!!verifyingOrder}
        onClose={() => setVerifyingOrderId(null)}
        title="Verifikasi Sampah"
        maxWidthClass="md:max-w-md"
      >
        {verifyingOrder && (
          <div className="space-y-4">
            <div className="text-xs font-medium text-[#1b3d20] dark:text-[#a8c7af] space-y-1 px-1">
              <p className="font-bold text-sm text-[#102916] dark:text-white">
                Dari {getUserDisplayName(users, verifyingOrder.by, verifyingOrder.byName)}
              </p>
              <p>
                {verifyingOrder.metode} · {verifyingOrder.tgl}
              </p>
              {verifyingOrder.alamat && (
                <p className="flex items-start gap-1.5 text-[#102916] dark:text-[#e8f3ec] font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#0f7a35] dark:text-[#6ee7a0] shrink-0 mt-0.5" />
                  <span>{verifyingOrder.alamat}</span>
                </p>
              )}
            </div>

            <div className="rounded-3xl border-2 border-[#4d7c49] bg-[#b4dab1]/60 dark:bg-[#192b1f] p-4 space-y-3">
              <div>
                <p className="font-extrabold text-sm">{verifyingOrder.jenis}</p>
                <p className="text-xs opacity-80 font-mono-num">
                  Perkiraan Berat: {verifyingOrder.berat} kg
                </p>
              </div>

              <div>
                <label
                  htmlFor="weighed-input"
                  className="block text-xs font-bold mb-1"
                >
                  Berat aktual hasil timbang (kg)
                </label>
                <input
                  id="weighed-input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weighedKg}
                  onChange={(e) => setWeighedKg(e.target.value)}
                  className="w-full min-h-[40px] rounded-full border border-[#4d7c49] bg-[#e9f1e8] dark:bg-[#15211a] px-4 py-1.5 text-sm font-mono-num focus:outline-2 focus:outline-[#0f7a35]"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-bold pt-1">
                <span>Harga Beli Sampah</span>
                <span className="font-mono-num rounded-full bg-[#e9f1e8] dark:bg-[#15211a] border border-[#4d7c49]/50 px-3 py-1">
                  {formatRupiah(
                    (parseFloat(weighedKg) || 0) * getOrderUnitPrice(verifyingOrder),
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-full bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#4d7c49] px-4 py-2.5 flex items-center justify-between text-xs font-bold">
                <span>Dibayar ke pengumpul</span>
                <span className="font-mono-num text-sm font-extrabold text-[#0f7a35] dark:text-[#6ee7a0]">
                  {formatRupiah(netPayForVerifying)}
                </span>
              </div>

              <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-[#3a5c3f] dark:text-[#93a89b]">
                <span>Saldo Eco-Pay Anda</span>
                <span className="font-mono-num font-bold text-[#102916] dark:text-white">
                  {formatRupiah(user.saldo)}
                </span>
              </div>

              {insufficientBalance && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-3 flex items-center justify-between gap-2 text-xs">
                  <p className="text-amber-900 dark:text-amber-200 font-semibold leading-snug">
                    Saldo Eco-Pay belum cukup untuk membayar setoran ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyingOrderId(null);
                      setActiveModal('isiSaldo');
                    }}
                    className="shrink-0 rounded-full bg-[#24c23b] hover:bg-[#1ca931] text-white px-3 py-1.5 text-[11px] font-extrabold whitespace-nowrap"
                  >
                    Isi Saldo
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={insufficientBalance}
                onClick={handleApprove}
                className="w-full min-h-[44px] rounded-full bg-[#4b8b42] hover:bg-[#3b7533] disabled:opacity-45 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-colors"
              >
                Terima &amp; Bayar
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="w-full min-h-[44px] rounded-full bg-[#c95b53] hover:bg-[#b04840] text-white font-extrabold text-sm transition-colors"
              >
                Tolak Sampah
              </button>
            </div>
          </div>
        )}
      </DrawerModal>

      {/* Modal: Isi Saldo Eco-Pay */}
      <DrawerModal
        open={activeModal === 'isiSaldo'}
        onClose={() => setActiveModal('none')}
        title="Isi Saldo Eco-Pay"
        subtitle="Tambah saldo untuk membayar setoran sampah pengumpul secara langsung."
        maxWidthClass="md:max-w-md"
      >
        <form onSubmit={handleConfirmTopup} className="space-y-4">
          <div className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#5f8f5b]/60 p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-[#3a5c3f] dark:text-[#93a89b]">
                Saldo Eco-Pay saat ini
              </p>
              <p className="font-mono-num text-xl font-extrabold text-[#102916] dark:text-white mt-0.5">
                {formatRupiah(user.saldo)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#15211a] border border-[#5f8f5b]/40 flex items-center justify-center text-[#0f7a35] dark:text-[#6ee7a0]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold mb-2">Pilih nominal cepat</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TOPUP_PRESETS.map((preset) => {
                const isSelected = Number(topupAmount) === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopupAmount(String(preset))}
                    className={`min-h-[38px] rounded-full px-3 py-1.5 text-xs font-mono-num font-bold border transition-colors ${
                      isSelected
                        ? 'bg-[#24c23b] border-[#24c23b] text-white'
                        : 'bg-[#e9f1e8] dark:bg-[#1a2b1f] border-[#5f8f5b]/50 text-[#102916] dark:text-[#e8f3ec] hover:bg-white dark:hover:bg-[#233d29]'
                    }`}
                  >
                    {formatRupiah(preset)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="topup-amount-input"
              className="block text-xs font-bold mb-1.5"
            >
              Nominal isi saldo (Rp)
            </label>
            <input
              id="topup-amount-input"
              type="number"
              min="10000"
              max="100000000"
              step="5000"
              required
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              className="w-full min-h-[44px] rounded-full border border-[#4d7c49] bg-[#e9f1e8] dark:bg-[#15211a] px-4 py-2 text-sm font-mono-num font-bold focus:outline-2 focus:outline-[#0f7a35]"
            />
            <p className="text-[11px] opacity-75 mt-1 px-1">
              Minimal Rp10.000 · Maksimal Rp100.000.000 per isi saldo.
            </p>
          </div>

          <div>
            <label
              htmlFor="topup-method-select"
              className="block text-xs font-bold mb-1.5"
            >
              Metode pembayaran
            </label>
            <select
              id="topup-method-select"
              value={topupMethod}
              onChange={(e) => setTopupMethod(e.target.value)}
              className="w-full min-h-[44px] rounded-full border border-[#4d7c49] bg-[#e9f1e8] dark:bg-[#15211a] px-4 py-2 text-sm font-semibold focus:outline-2 focus:outline-[#0f7a35]"
            >
              {TOPUP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={topupSubmitting}
            className="w-full min-h-[44px] rounded-full bg-[#24c23b] hover:bg-[#1ca931] disabled:opacity-50 text-white font-extrabold text-sm transition-colors"
          >
            {topupSubmitting ? 'Memproses...' : 'Konfirmasi Isi Saldo'}
          </button>

          {topups.length > 0 && (
            <div className="pt-2 border-t border-[#d6ecd8] dark:border-[#243329] space-y-2">
              <p className="text-xs font-extrabold">Riwayat isi saldo terbaru</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {[...topups]
                  .reverse()
                  .slice(0, 6)
                  .map((item, idx) => (
                    <div
                      key={`${item.t}-${item.n}-${idx}`}
                      className="rounded-xl bg-[#e9f1e8] dark:bg-[#1a2b1f] px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold">{item.metode}</p>
                        <p className="text-[11px] opacity-75">{item.t}</p>
                      </div>
                      <span className="font-mono-num font-extrabold text-[#0f7a35] dark:text-[#6ee7a0]">
                        +{formatRupiah(item.n)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </form>
      </DrawerModal>

      {/* Modal: Buku Besar Digital */}
      <DrawerModal
        open={activeModal === 'buku'}
        onClose={() => setActiveModal('none')}
        title="Buku Besar Digital"
        subtitle={`${getDisplayName(user)} · dicatat otomatis dari transaksi yang selesai`}
        maxWidthClass="md:max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(LEDGER_ACCOUNTS) as LedgerAccountKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setLedgerTab(key)}
                className={`min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  ledgerTab === key
                    ? 'bg-[#2b6b2b] text-white'
                    : 'bg-[#e9f1e8] dark:bg-[#1a2b1f] text-[#102916] dark:text-[#e8f3ec]'
                }`}
              >
                {LEDGER_ACCOUNTS[key].name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
            <span className="font-extrabold text-sm">{currentAccount.name}</span>
            <span className="font-mono-num opacity-80">
              Kode {currentAccount.code} · saldo normal{' '}
              {currentAccount.normal === 'D' ? 'debit' : 'kredit'}
            </span>
          </div>

          {computedRows.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#4d7c49]/50">
              <table className="w-full min-w-[540px] border-collapse text-xs">
                <thead className="bg-[#cfe5cd] dark:bg-[#122217]">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-bold">Tanggal</th>
                    <th className="py-2.5 px-3 text-left font-bold">Bukti</th>
                    <th className="py-2.5 px-3 text-left font-bold">Keterangan</th>
                    <th className="py-2.5 px-3 text-right font-bold">Debit</th>
                    <th className="py-2.5 px-3 text-right font-bold">Kredit</th>
                    <th className="py-2.5 px-3 text-right font-bold">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4d7c49]/25">
                  {computedRows.map((row, idx) => (
                    <tr key={`${row.b}-${idx}`}>
                      <td className="py-2.5 px-3 whitespace-nowrap">{row.t}</td>
                      <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                        {row.b}
                      </td>
                      <td className="py-2.5 px-3">{row.k}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                        {row.d ? formatRupiah(row.d) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                        {row.c ? formatRupiah(row.c) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold whitespace-nowrap">
                        {formatRupiah(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#cfe5cd]/80 dark:bg-[#122217] font-extrabold border-t border-[#4d7c49]/40">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3">
                      Total
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(sumDebit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(sumCredit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                      {formatRupiah(runningBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm opacity-75">
              Belum ada pencatatan. Transaksi yang sudah diterima akan masuk otomatis.
            </p>
          )}

          <div className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#4d7c49]/50 p-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Total debit semua akun</span>
              <span className="font-mono-num font-bold">
                {formatRupiah(ledgerData.allDebit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total kredit semua akun</span>
              <span className="font-mono-num font-bold">
                {formatRupiah(ledgerData.allCredit)}
              </span>
            </div>
            <div className="pt-1.5 flex items-center gap-1.5 font-bold">
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0f7a35] dark:text-[#6ee7a0]" />
                  <span className="text-[#0f7a35] dark:text-[#6ee7a0]">Seimbang</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-[#c95b53]" />
                  <span className="text-[#c95b53]">Tidak seimbang</span>
                </>
              )}
            </div>
          </div>
        </div>
      </DrawerModal>
    </div>
  );
};
