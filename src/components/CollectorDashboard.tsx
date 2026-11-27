import React, { useMemo, useState } from 'react';
import {
  Recycle,
  Wallet,
  ReceiptText,
  BarChart3,
  BookOpen,
  Star,
  ArrowLeft,
  CheckCircle2,
  Leaf,
  Store,
  User as UserIcon,
} from 'lucide-react';
import type {
  DepositMethod,
  Order,
  PengepulRatingRecord,
  SortOrder,
  User,
} from '../types/ecoting';
import {
  WASTE_CATEGORIES,
  formatDeliverySummary,
  formatRupiah,
  getAcceptedCategoryIds,
  getDeliverySettings,
  getDisplayName,
  getPengepulRating,
  getUserOrders,
} from '../data/ecotingStore';
import { DrawerModal } from './DrawerModal';
import { OrderCard } from './OrderCard';
import { WasteIcon } from './WasteIcon';

interface CollectorDashboardProps {
  user: User;
  users: User[];
  orders: Order[];
  ratings?: PengepulRatingRecord[];
  activeModal:
    | 'none'
    | 'cari'
    | 'detailPengepul'
    | 's1'
    | 's3'
    | 'tarik'
    | 'laporan'
    | 'panduan';
  setActiveModal: (
    modal:
      | 'none'
      | 'cari'
      | 'detailPengepul'
      | 's1'
      | 's3'
      | 'tarik'
      | 'laporan'
      | 'panduan',
  ) => void;
  onOpenHistory: () => void;
  onOpenReceipt: (orderId: number) => void;
  onOpenRate: (orderId: number) => void;
  onOpenDetail: (order: Order) => void;
  onSubmitOrders: (newOrders: Order[]) => void;
  onWithdraw: (amount: number) => void;
  onToast: (msg: string) => void;
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({
  user,
  users,
  orders,
  ratings,
  activeModal,
  setActiveModal,
  onOpenHistory,
  onOpenReceipt,
  onOpenRate,
  onOpenDetail,
  onSubmitOrders,
  onWithdraw,
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
  const totalEarned = useMemo(
    () => doneOrders.reduce((acc, o) => acc + ((o.total || 0) - o.ongkir), 0),
    [doneOrders],
  );

  // Setor wizard state
  const [filterCat, setFilterCat] = useState<number>(-1);
  const [sortOrder, setSortOrder] = useState<SortOrder>('jarak');
  const [selectedPengepulId, setSelectedPengepulId] = useState<string>('');
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [method, setMethod] = useState<DepositMethod>('Antar sendiri');
  const [pickupAddress, setPickupAddress] = useState('');

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const pengepulList = useMemo(() => {
    const all = users.filter((u) => u.role === 'pengepul');
    const filtered = all.filter(
      (p) => filterCat < 0 || (p.harga && p.harga[filterCat] > 0),
    );
    const activeSort =
      filterCat < 0 && sortOrder === 'harga' ? 'jarak' : sortOrder;

    return [...filtered].sort((a, b) => {
      if (activeSort === 'harga' && filterCat >= 0) {
        return (b.harga?.[filterCat] || 0) - (a.harga?.[filterCat] || 0);
      }
      if (activeSort === 'rating') {
        return (
          getPengepulRating(b, orders, ratings).avg -
          getPengepulRating(a, orders, ratings).avg
        );
      }
      return (a.jarak ?? 99) - (b.jarak ?? 99);
    });
  }, [users, orders, ratings, filterCat, sortOrder]);

  const selectedPengepul = useMemo(
    () => users.find((u) => u.id === selectedPengepulId) || null,
    [users, selectedPengepulId],
  );

  const selectedDelivery = useMemo(
    () =>
      selectedPengepul
        ? getDeliverySettings(selectedPengepul)
        : { terimaAntar: true, terimaJemput: true, ongkirJemput: 3000 },
    [selectedPengepul],
  );

  const acceptedIds = useMemo(
    () => (selectedPengepul ? getAcceptedCategoryIds(selectedPengepul) : []),
    [selectedPengepul],
  );

  const selectedItems = useMemo(() => {
    if (!selectedPengepul) return [];
    return acceptedIds
      .map((catId) => {
        const kg = parseFloat(weights[catId] || '0');
        const price = selectedPengepul.harga?.[catId] || 0;
        return { catId, kg, price };
      })
      .filter((x) => x.kg > 0);
  }, [selectedPengepul, acceptedIds, weights]);

  const estimatedTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.kg * item.price, 0),
    [selectedItems],
  );

  const openSearchPengepul = () => {
    setFilterCat(-1);
    setSortOrder('jarak');
    setActiveModal('cari');
  };

  const handleInspectPengepul = (pengepul: User) => {
    if (!getAcceptedCategoryIds(pengepul).length) {
      onToast('Pengepul ini belum mengatur harga');
      return;
    }
    const cfg = getDeliverySettings(pengepul);
    setSelectedPengepulId(pengepul.id);
    setWeights({});
    setMethod(cfg.terimaAntar ? 'Antar sendiri' : 'Dijemput');
    setPickupAddress(user.alamat || '');
    setActiveModal('detailPengepul');
  };

  const handleGoStep3 = () => {
    if (!selectedItems.length) {
      onToast('Isi berat minimal satu jenis sampah');
      return;
    }
    setActiveModal('s3');
  };

  const handleSubmitDeposit = () => {
    if (!selectedPengepul || !selectedItems.length) {
      onToast('Isi berat minimal satu jenis sampah');
      return;
    }
    if (method === 'Dijemput' && !selectedDelivery.terimaJemput) {
      onToast('Pengepul ini hanya melayani antar sendiri');
      return;
    }
    if (method === 'Antar sendiri' && !selectedDelivery.terimaAntar) {
      onToast('Pengepul ini hanya melayani penjemputan');
      return;
    }
    if (method === 'Dijemput' && !pickupAddress.trim()) {
      onToast('Isi alamat penjemputan');
      return;
    }
    const pickupFee = selectedDelivery.ongkirJemput;
    if (
      method === 'Dijemput' &&
      pickupFee > 0 &&
      estimatedTotal < pickupFee &&
      user.saldo < pickupFee
    ) {
      onToast('Estimasi setoran atau saldo belum cukup untuk ongkir');
      return;
    }

    const now = Date.now();
    const today = new Date().toLocaleDateString('id-ID');
    const newOrders: Order[] = selectedItems.map((item, idx) => ({
      id: now + idx,
      by: user.id,
      byName: getDisplayName(user),
      to: selectedPengepul.id,
      toName: getDisplayName(selectedPengepul),
      jenis: WASTE_CATEGORIES[item.catId].name,
      jid: item.catId,
      berat: item.kg,
      hrg: item.price,
      est: item.kg * item.price,
      metode: method,
      alamat: method === 'Dijemput' ? pickupAddress.trim() : '',
      ongkir: idx === 0 && method === 'Dijemput' ? pickupFee : 0,
      status: 'Menunggu',
      tgl: today,
    }));

    onSubmitOrders(newOrders);
    setActiveModal('none');
    onToast(
      `Setoran diajukan (${selectedItems.length} jenis). Tunggu verifikasi pengepul`,
    );
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(withdrawAmount, 10);
    if (!user.rek) {
      onToast('Nomor rekening belum diisi di akun');
      return;
    }
    if (!(amount >= 10000)) {
      onToast('Minimal penarikan Rp10.000');
      return;
    }
    if (amount > user.saldo) {
      onToast('Saldo tidak cukup');
      return;
    }
    onWithdraw(amount);
    setWithdrawAmount('');
    setActiveModal('none');
  };

  const categoryBreakdown = useMemo(() => {
    return WASTE_CATEGORIES.map((cat) => {
      const catDone = doneOrders.filter((o) => o.jid === cat.id);
      return {
        id: cat.id,
        name: cat.name,
        kg: catDone.reduce((s, o) => s + (o.final || 0), 0),
        rp: catDone.reduce((s, o) => s + (o.total || 0), 0),
      };
    }).filter((x) => x.kg > 0);
  }, [doneOrders]);

  const maxCategoryKg = Math.max(1, ...categoryBreakdown.map((c) => c.kg));

  const activeSortKey: SortOrder =
    filterCat < 0 && sortOrder === 'harga' ? 'jarak' : sortOrder;

  return (
    <div className="space-y-6">
      {/* Top Vivid Green Header + Overlapping Saldo Card matching Figma Screenshot 4 */}
      <section className="relative">
        <div className="rounded-3xl bg-gradient-to-b from-[#25c13b] via-[#3bc94f] to-[#98df9f] dark:from-[#126825] dark:via-[#17782e] dark:to-[#1d3b24] text-white px-5 pt-5 pb-16 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full border-2 border-white bg-white/15 flex items-center justify-center shrink-0">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/90">Halo,</p>
                <p className="text-base font-bold truncate">{user.nama}</p>
              </div>
            </div>

            <div className="w-11 h-11 rounded-full bg-white p-1 shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/ecoting-logo.png"
                alt="ECO-TING"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Overlapping Floating Saldo Eco-Ting Card */}
        <div className="mx-3 md:mx-5 -mt-11 rounded-2xl bg-[#f5f7f5] dark:bg-[#15211a] border border-[#dce6dc] dark:border-[#243329] p-4 md:p-5 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#234229] dark:text-[#a8c7af]">
              Saldo Eco-Ting
            </span>
            <button
              type="button"
              onClick={() => {
                setWithdrawAmount('');
                setActiveModal('tarik');
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#1e2e23] border border-[#bfd4c0] dark:border-[#2d4a34] px-3 py-1.5 min-h-[34px] text-xs font-bold text-[#102916] dark:text-[#e8f3ec] shadow-2xs hover:border-[#25c13b] transition-colors whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 text-[#0f7a35] dark:text-[#6ee7a0]" />
              <span>Tarik Saldo</span>
            </button>
          </div>
          <h1 className="font-mono-num text-2xl md:text-3xl font-extrabold text-[#0c2612] dark:text-white mt-1.5">
            {formatRupiah(user.saldo)}
          </h1>
        </div>
      </section>

      {/* 4-Column Quick Service Row matching Figma */}
      <section className="grid grid-cols-4 gap-2.5 md:gap-4 px-1">
        <button
          type="button"
          onClick={openSearchPengepul}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-[#15211a] border-2 border-[#4d7c49] dark:border-[#2e5237] flex items-center justify-center text-[#1d8f34] dark:text-[#6ee7a0] shadow-xs group-hover:scale-[1.03] transition-transform">
            <Recycle className="w-7 h-7" />
          </div>
          <span className="text-[10px] md:text-xs font-extrabold tracking-tight text-center text-[#102916] dark:text-[#e8f3ec] leading-tight">
            SETOR SAMPAH
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setWithdrawAmount('');
            setActiveModal('tarik');
          }}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-[#15211a] border-2 border-[#4d7c49] dark:border-[#2e5237] flex items-center justify-center text-[#1d8f34] dark:text-[#6ee7a0] shadow-xs group-hover:scale-[1.03] transition-transform">
            <Wallet className="w-7 h-7" />
          </div>
          <span className="text-[10px] md:text-xs font-extrabold tracking-tight text-center text-[#102916] dark:text-[#e8f3ec] leading-tight">
            TARIK SALDO
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-[#15211a] border-2 border-[#4d7c49] dark:border-[#2e5237] flex items-center justify-center text-[#1d8f34] dark:text-[#6ee7a0] shadow-xs group-hover:scale-[1.03] transition-transform">
            <ReceiptText className="w-7 h-7" />
          </div>
          <span className="text-[10px] md:text-xs font-extrabold tracking-tight text-center text-[#102916] dark:text-[#e8f3ec] leading-tight">
            RIWAYAT
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal('laporan')}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-[#15211a] border-2 border-[#4d7c49] dark:border-[#2e5237] flex items-center justify-center text-[#1d8f34] dark:text-[#6ee7a0] shadow-xs group-hover:scale-[1.03] transition-transform">
            <BarChart3 className="w-7 h-7" />
          </div>
          <span className="text-[10px] md:text-xs font-extrabold tracking-tight text-center text-[#102916] dark:text-[#e8f3ec] leading-tight">
            LAPORAN
          </span>
        </button>
      </section>

      {/* Dark Forest Green Net Zero Waste Banner + 3 Stat Boxes */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl bg-gradient-to-r from-[#0a4619] to-[#17782e] text-white p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Leaf className="w-7 h-7 text-[#6ee7a0]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-base leading-snug">
                Dukung Net Zero Waste
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">
                Setiap setoran membuat sampah Tembalang lebih terpilah.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('panduan')}
              aria-label="Panduan memilah sampah"
              className="min-h-[40px] px-3 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Panduan</span>
            </button>
          </div>

          {/* 3 Outlined Stat Boxes matching Figma */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white dark:bg-[#15211a] border-2 border-[#3d733a] dark:border-[#2e5237] py-3 px-2 text-center shadow-2xs">
              <p className="font-mono-num text-lg font-extrabold text-[#102916] dark:text-[#6ee7a0]">
                {totalKg.toFixed(1)}
              </p>
              <p className="text-[11px] font-semibold text-[#47684d] dark:text-[#93a89b]">
                kg tersetor
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-[#15211a] border-2 border-[#3d733a] dark:border-[#2e5237] py-3 px-2 text-center shadow-2xs">
              <p className="font-mono-num text-lg font-extrabold text-[#102916] dark:text-[#6ee7a0]">
                {doneOrders.length}
              </p>
              <p className="text-[11px] font-semibold text-[#47684d] dark:text-[#93a89b]">
                trx
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-[#15211a] border-2 border-[#3d733a] dark:border-[#2e5237] py-3 px-2 text-center shadow-2xs">
              <p className="font-mono-num text-lg font-extrabold text-[#102916] dark:text-[#6ee7a0] truncate">
                {Math.round(totalEarned).toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] font-semibold text-[#47684d] dark:text-[#93a89b]">
                rupiah didapat
              </p>
            </div>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold text-[#102916] dark:text-[#e8f3ec]">
              Menunggu verifikasi
            </h2>
            {myOrders.length > 0 && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="text-xs font-bold text-[#0f7a35] dark:text-[#6ee7a0] hover:underline"
              >
                Lihat riwayat
              </button>
            )}
          </div>

          {waitingOrders.length > 0 ? (
            <div className="space-y-3">
              {waitingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  users={users}
                  isCollectorView
                  onOpenReceipt={onOpenReceipt}
                  onOpenRate={onOpenRate}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#15211a] border-2 border-[#dce6dc] dark:border-[#243329] p-7 text-center">
              <p className="font-bold text-sm">Belum ada setoran yang menunggu</p>
              <p className="text-xs text-[#5f7367] dark:text-[#93a89b] mt-1">
                Pilih Setor Sampah untuk mulai mencari pengepul terdekat di Tembalang.
              </p>
              <button
                type="button"
                onClick={openSearchPengepul}
                className="mt-4 min-h-[42px] rounded-full bg-[#2eb547] hover:bg-[#239c3a] text-white px-5 py-2 text-xs font-extrabold transition-colors"
              >
                Cari Pengepul
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SCREEN 1: Cari Pengepul (Figma Screenshot 4, Top Screen 2) */}
      <DrawerModal
        open={activeModal === 'cari'}
        onClose={() => setActiveModal('none')}
        title="Cari Pengepul"
        subtitle="Pilih pengepul terdekat. Bandingkan jarak dan jenis sampah yang diterima."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFilterCat(-1);
                if (sortOrder === 'harga') setSortOrder('jarak');
              }}
              className={`min-h-[34px] rounded-full px-3.5 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                filterCat < 0
                  ? 'bg-[#2b6b2b] text-white'
                  : 'bg-[#e9f1e8] dark:bg-[#1e3524] text-[#102916] dark:text-[#e8f3ec]'
              }`}
            >
              Semua
            </button>
            {WASTE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFilterCat(cat.id);
                  setSortOrder('harga');
                }}
                className={`min-h-[34px] rounded-full px-3.5 py-1 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  filterCat === cat.id
                    ? 'bg-[#2b6b2b] text-white'
                    : 'bg-[#e9f1e8] dark:bg-[#1e3524] text-[#102916] dark:text-[#e8f3ec]'
                }`}
              >
                <WasteIcon categoryId={cat.id} className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">Urutkan:</span>
            <button
              type="button"
              onClick={() => setSortOrder('jarak')}
              className={`min-h-[32px] rounded-full px-3 py-1 font-bold transition-colors ${
                activeSortKey === 'jarak'
                  ? 'bg-[#2b6b2b] text-white'
                  : 'bg-[#e9f1e8] dark:bg-[#1e3524]'
              }`}
            >
              Terdekat
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('rating')}
              className={`min-h-[32px] rounded-full px-3 py-1 font-bold transition-colors ${
                activeSortKey === 'rating'
                  ? 'bg-[#2b6b2b] text-white'
                  : 'bg-[#e9f1e8] dark:bg-[#1e3524]'
              }`}
            >
              Rating
            </button>
            {filterCat >= 0 && (
              <button
                type="button"
                onClick={() => setSortOrder('harga')}
                className={`min-h-[32px] rounded-full px-3 py-1 font-bold transition-colors ${
                  activeSortKey === 'harga'
                    ? 'bg-[#2b6b2b] text-white'
                    : 'bg-[#e9f1e8] dark:bg-[#1e3524]'
                }`}
              >
                Harga
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {pengepulList.length > 0 ? (
              pengepulList.map((p) => {
                const rating = getPengepulRating(p, orders, ratings);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleInspectPengepul(p)}
                    className="w-full text-left rounded-full bg-[#e9f1e8] dark:bg-[#1e3524] border border-[#5f8f5b] hover:bg-white dark:hover:bg-[#274630] px-4 py-3 flex items-center gap-3.5 transition-colors shadow-2xs"
                  >
                    <div className="w-11 h-11 rounded-full bg-white border-2 border-[#259b38] flex items-center justify-center text-[#1d8f34] shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-sm text-[#102916] dark:text-white truncate">
                          {getDisplayName(p)}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          <span className="font-mono-num">
                            {rating.count > 0 ? rating.avg.toFixed(1) : 'Baru'}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[#2c5232] dark:text-[#a8c7af] truncate mt-0.5 font-mono-num">
                        {(p.jarak ?? 1.0).toFixed(1)} km · {formatDeliverySummary(p)}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm opacity-80">
                Belum ada pengepul yang tersedia untuk jenis sampah ini.
              </p>
            )}
          </div>
        </div>
      </DrawerModal>

      {/* SCREEN 2: Detail Pengepul (Figma Screenshot 4, Top Screen 3) */}
      <DrawerModal
        open={activeModal === 'detailPengepul'}
        onClose={() => setActiveModal('none')}
        title="Detail Pengepul"
      >
        {selectedPengepul && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveModal('cari')}
              className="rounded-full bg-[#e9f1e8] dark:bg-[#1e3524] border border-[#5f8f5b] px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ganti Pengepul</span>
            </button>

            <div className="rounded-full bg-[#e9f1e8] dark:bg-[#1e3524] border border-[#5f8f5b] px-4 py-3 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-white border-2 border-[#259b38] flex items-center justify-center text-[#1d8f34] shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm uppercase tracking-wide truncate">
                  {getDisplayName(selectedPengepul)}
                </h3>
                <p className="text-[11px] text-[#2c5232] dark:text-[#a8c7af] font-mono-num">
                  {(selectedPengepul.jarak ?? 1.0).toFixed(1)} km ·{' '}
                  {formatDeliverySummary(selectedPengepul)}
                </p>
                {selectedDelivery.catatan && (
                  <p className="text-[11px] text-[#3a5c3f] dark:text-[#8eb096] truncate mt-0.5">
                    {selectedDelivery.catatan}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-[#c2dfc0] dark:bg-[#19301e] border border-[#5f8f5b]/50 p-4 space-y-2.5">
              {acceptedIds.map((catId) => (
                <div
                  key={catId}
                  className="rounded-full bg-[#689d65] dark:bg-[#28542e] text-[#0c260e] dark:text-white px-4 py-2.5 flex items-center justify-between text-xs font-extrabold"
                >
                  <span>{WASTE_CATEGORIES[catId].name}</span>
                  <span className="font-mono-num">
                    {formatRupiah(selectedPengepul.harga?.[catId] || 0)}/kg
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setActiveModal('s1')}
                className="w-52 min-h-[44px] rounded-full bg-[#4b8b42] hover:bg-[#3b7533] text-white font-extrabold text-sm shadow-sm transition-colors"
              >
                Setor ke sini
              </button>
            </div>
          </div>
        )}
      </DrawerModal>

      {/* SCREEN 3: DATA SAMPAH (Figma Screenshot 4, Top Screen 4) */}
      <DrawerModal
        open={activeModal === 's1'}
        onClose={() => setActiveModal('none')}
        title="DATA SAMPAH"
        subtitle={
          selectedPengepul
            ? `Setor ke ${getDisplayName(selectedPengepul)}`
            : ''
        }
      >
        {selectedPengepul && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-[#92bf8f] dark:bg-[#19301e] p-4 space-y-3.5">
              {acceptedIds.map((catId) => {
                const cat = WASTE_CATEGORIES[catId];
                const price = selectedPengepul.harga?.[catId] || 0;
                return (
                  <div key={catId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>{cat.name}</span>
                      <span className="font-mono-num text-xs">
                        {formatRupiah(price)}/kg
                      </span>
                    </div>
                    <label
                      htmlFor={`weight-${catId}`}
                      className="block text-[11px] font-medium opacity-80"
                    >
                      Perkiraan berat (kg)
                    </label>
                    <input
                      id={`weight-${catId}`}
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.0"
                      value={weights[catId] || ''}
                      onChange={(e) =>
                        setWeights((prev) => ({
                          ...prev,
                          [catId]: e.target.value,
                        }))
                      }
                      className="w-full min-h-[42px] rounded-xl bg-[#e9f1e8] dark:bg-[#15211a] border border-[#5f8f5b]/50 px-3.5 py-2 text-sm font-mono-num focus:outline-2 focus:outline-[#0f7a35]"
                    />
                  </div>
                );
              })}

              <div className="pt-2 border-t border-[#5f8f5b]/40 flex items-center justify-between text-sm font-extrabold">
                <span>Estimasi Total</span>
                <span className="font-mono-num text-base">
                  {formatRupiah(estimatedTotal)}
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoStep3}
                className="w-56 min-h-[44px] rounded-full bg-[#4b8b42] hover:bg-[#3b7533] text-white font-extrabold text-sm shadow-sm transition-colors"
              >
                Metode Pengambilan
              </button>
            </div>
          </div>
        )}
      </DrawerModal>

      {/* SCREEN 4: METODE PENGAMBILAN (Figma Screenshot 1, Screens 2-3) */}
      <DrawerModal
        open={activeModal === 's3'}
        onClose={() => setActiveModal('none')}
        title="METODE PENGAMBILAN"
        subtitle={
          selectedPengepul
            ? `Penyetoran ke ${getDisplayName(selectedPengepul)}`
            : ''
        }
      >
        {selectedPengepul && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!selectedDelivery.terimaJemput}
                onClick={() => setMethod('Dijemput')}
                className={`min-h-[58px] rounded-2xl border-2 px-3 py-2 text-center transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
                  method === 'Dijemput'
                    ? 'border-[#0f7a35] bg-white dark:bg-[#234529] text-[#0f7a35] dark:text-white shadow-sm'
                    : 'border-transparent bg-[#e9f1e8] dark:bg-[#1a2b1f] text-[#102916] dark:text-[#a8c7af]'
                }`}
              >
                <span className="block text-sm font-extrabold">Dijemput</span>
                <span className="block text-[11px] font-semibold opacity-80 font-mono-num">
                  {selectedDelivery.terimaJemput
                    ? selectedDelivery.ongkirJemput > 0
                      ? `Ongkir ${formatRupiah(selectedDelivery.ongkirJemput)}`
                      : 'Gratis ongkir'
                    : 'Tidak tersedia'}
                </span>
              </button>
              <button
                type="button"
                disabled={!selectedDelivery.terimaAntar}
                onClick={() => setMethod('Antar sendiri')}
                className={`min-h-[58px] rounded-2xl border-2 px-3 py-2 text-center transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
                  method === 'Antar sendiri'
                    ? 'border-[#0f7a35] bg-white dark:bg-[#234529] text-[#0f7a35] dark:text-white shadow-sm'
                    : 'border-transparent bg-[#e9f1e8] dark:bg-[#1a2b1f] text-[#102916] dark:text-[#a8c7af]'
                }`}
              >
                <span className="block text-sm font-extrabold">Antar Sendiri</span>
                <span className="block text-[11px] font-semibold opacity-80">
                  {selectedDelivery.terimaAntar
                    ? 'Gratis ongkir'
                    : 'Tidak tersedia'}
                </span>
              </button>
            </div>

            {selectedDelivery.catatan && (
              <p className="text-xs font-medium text-[#2c5232] dark:text-[#a8c7af] bg-[#e9f1e8] dark:bg-[#1a2b1f] rounded-xl px-3.5 py-2">
                Info pengepul: {selectedDelivery.catatan}
              </p>
            )}

            {method === 'Dijemput' && (
              <div>
                <label
                  htmlFor="pickup-addr"
                  className="block text-xs font-bold mb-1.5"
                >
                  Alamat Penjemputan
                </label>
                <input
                  id="pickup-addr"
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Kos / gedung, Tembalang"
                  className="w-full min-h-[44px] rounded-xl bg-[#e9f1e8] dark:bg-[#15211a] border border-[#5f8f5b] px-3.5 py-2.5 text-sm focus:outline-2 focus:outline-[#0f7a35]"
                />
              </div>
            )}

            {/* Darker Sage Summary Card matching Figma */}
            <div className="rounded-2xl bg-[#689d65] dark:bg-[#204026] text-[#0b230d] dark:text-white p-4 space-y-2 text-xs font-bold">
              {selectedItems.map((item) => (
                <div key={item.catId} className="flex justify-between">
                  <span>
                    {WASTE_CATEGORIES[item.catId].name} ({item.kg} kg)
                  </span>
                  <span className="font-mono-num">
                    {formatRupiah(item.kg * item.price)}
                  </span>
                </div>
              ))}
              {method === 'Dijemput' && (
                <div className="flex justify-between">
                  <span>Ongkir (Dibayar Pengumpul)</span>
                  <span className="font-mono-num">
                    {selectedDelivery.ongkirJemput > 0
                      ? `-${formatRupiah(selectedDelivery.ongkirJemput)}`
                      : 'Gratis'}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-black/15 dark:border-white/15 flex justify-between text-sm font-extrabold">
                <span>Total Harga</span>
                <span className="font-mono-num">
                  {formatRupiah(
                    Math.max(
                      0,
                      estimatedTotal -
                        (method === 'Dijemput'
                          ? selectedDelivery.ongkirJemput
                          : 0),
                    ),
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleSubmitDeposit}
                className="w-60 min-h-[46px] rounded-full bg-[#e9f1e8] hover:bg-white text-[#102916] border border-[#4d7c49] font-extrabold text-sm shadow-sm transition-colors"
              >
                Ajukan Transaksi
              </button>
            </div>
          </div>
        )}
      </DrawerModal>

      {/* Tarik Saldo */}
      <DrawerModal
        open={activeModal === 'tarik'}
        onClose={() => setActiveModal('none')}
        title="Tarik Saldo"
        subtitle={`Saldo tersedia: ${formatRupiah(user.saldo)}`}
        maxWidthClass="md:max-w-md"
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          <div className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#4d7c49]/50 p-4">
            <p className="text-xs opacity-75">Rekening tujuan</p>
            <p className="font-bold text-sm mt-0.5">
              {user.bank || '-'} ·{' '}
              <span className="font-mono-num">{user.rek || 'belum diisi'}</span>
            </p>
          </div>

          <div>
            <label
              htmlFor="withdraw-nominal"
              className="block text-xs font-bold mb-1.5"
            >
              Nominal penarikan (Rp)
            </label>
            <input
              id="withdraw-nominal"
              type="number"
              min="10000"
              step="1000"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Minimal Rp10.000"
              className="w-full min-h-[44px] rounded-full bg-[#e9f1e8] dark:bg-[#15211a] border border-[#4d7c49] px-4 py-2.5 text-sm font-mono-num focus:outline-2 focus:outline-[#0f7a35]"
            />
            <button
              type="button"
              onClick={() => setWithdrawAmount(String(Math.floor(user.saldo)))}
              className="mt-2 rounded-full bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#4d7c49]/60 px-3.5 py-1.5 text-xs font-bold"
            >
              Tarik semua ({formatRupiah(Math.floor(user.saldo))})
            </button>
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-full bg-[#2eb547] hover:bg-[#239c3a] text-white font-extrabold text-sm transition-colors"
          >
            Tarik Saldo
          </button>

          <p className="text-xs opacity-75">
            Minimal Rp10.000. Ini simulasi tanpa transaksi uang asli.
          </p>
        </form>
      </DrawerModal>

      {/* Laporan Setoran */}
      <DrawerModal
        open={activeModal === 'laporan'}
        onClose={() => setActiveModal('none')}
        title="Laporan Setoran"
        subtitle="Ringkasan setoran berdasarkan kategori sampah"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] p-3 text-center">
              <p className="font-mono-num text-lg font-extrabold text-[#0f7a35] dark:text-[#6ee7a0]">
                {totalKg.toFixed(1)}
              </p>
              <p className="text-xs opacity-75">kg</p>
            </div>
            <div className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] p-3 text-center">
              <p className="font-mono-num text-lg font-extrabold text-[#0f7a35] dark:text-[#6ee7a0]">
                {doneOrders.length}
              </p>
              <p className="text-xs opacity-75">selesai</p>
            </div>
            <div className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] p-3 text-center">
              <p className="font-mono-num text-lg font-extrabold text-[#0f7a35] dark:text-[#6ee7a0]">
                {Math.round(totalEarned).toLocaleString('id-ID')}
              </p>
              <p className="text-xs opacity-75">rp diterima</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold inline-flex items-center gap-2">
                      <WasteIcon categoryId={item.id} className="w-4 h-4 text-[#0f7a35]" />
                      <span>{item.name}</span>
                    </span>
                    <span className="font-mono-num font-bold">
                      {item.kg.toFixed(1)} kg
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/80 dark:bg-[#0c1510] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2eb547]"
                      style={{ width: `${(item.kg / maxCategoryKg) * 100}%` }}
                    />
                  </div>
                  <p className="font-mono-num text-xs opacity-80">
                    {formatRupiah(item.rp)}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm opacity-75">
                Belum ada transaksi selesai.
              </p>
            )}
          </div>
        </div>
      </DrawerModal>

      {/* Panduan Memilah */}
      <DrawerModal
        open={activeModal === 'panduan'}
        onClose={() => setActiveModal('none')}
        title="Panduan Memilah"
        subtitle="5 langkah agar setoran diterima dengan harga terbaik"
        maxWidthClass="md:max-w-md"
      >
        <div className="space-y-2.5">
          {[
            'Kosongkan dan bilas botol atau kaleng sebelum disimpan.',
            'Pisahkan plastik, kaca, kaleng, dan kertas agar tidak tercampur.',
            'Jaga kertas dan kardus tetap kering dan terlipat rapi.',
            'Timbang perkiraan berat, lalu ajukan setoran ke pengepul.',
            'Pengepul menimbang ulang saat verifikasi, saldo masuk otomatis.',
          ].map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] p-3.5 flex items-start gap-3 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-[#0f7a35] dark:text-[#6ee7a0] shrink-0 mt-0.5" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </DrawerModal>
    </div>
  );
};
