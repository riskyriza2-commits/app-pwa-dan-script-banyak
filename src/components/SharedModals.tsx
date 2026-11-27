import React from 'react';
import { Star, ArrowDownLeft } from 'lucide-react';
import type { Order, User, Withdrawal } from '../types/ecoting';
import {
  formatRupiah,
  getOrderUnitPrice,
  getUserDisplayName,
  getUserOrders,
} from '../data/ecotingStore';
import { DrawerModal } from './DrawerModal';
import { OrderCard } from './OrderCard';
import { WasteIcon } from './WasteIcon';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  users: User[];
  orders: Order[];
  withdrawals: Withdrawal[];
  onOpenReceipt: (orderId: number) => void;
  onOpenRate: (orderId: number) => void;
  onOpenDetail?: (order: Order) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  open,
  onClose,
  user,
  users,
  orders,
  withdrawals,
  onOpenReceipt,
  onOpenRate,
  onOpenDetail,
}) => {
  const isCollector = user.role === 'pengumpul';
  const list = getUserOrders(orders, user).filter(
    (o) => isCollector || o.status === 'Selesai',
  );
  const myWithdrawals = withdrawals
    .filter((w) => w.u === user.id)
    .slice()
    .reverse();

  return (
    <DrawerModal
      open={open}
      onClose={onClose}
      title={isCollector ? 'Riwayat Transaksi' : 'Riwayat Pembelian'}
      subtitle={
        isCollector
          ? 'Seluruh setoran dan penarikan saldo'
          : 'Pembelian yang sudah selesai'
      }
    >
      <div className="space-y-3">
        {list.length > 0 ? (
          list.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              users={users}
              isCollectorView={isCollector}
              onOpenReceipt={onOpenReceipt}
              onOpenRate={isCollector ? onOpenRate : undefined}
              onOpenDetail={onOpenDetail}
            />
          ))
        ) : (
          <div className="rounded-2xl bg-[#e9f1e8]/80 dark:bg-[#1a2b1f] p-8 text-center text-sm font-medium text-[#244729] dark:text-[#9fc2a7]">
            {isCollector
              ? 'Belum ada transaksi setoran.'
              : 'Belum ada pembelian yang selesai.'}
          </div>
        )}

        {isCollector && myWithdrawals.length > 0 && (
          <div className="pt-3 border-t border-[#5f8f5b]/40">
            <h3 className="text-sm font-bold mb-2.5">Penarikan saldo</h3>
            <div className="space-y-2">
              {myWithdrawals.map((w, idx) => (
                <div
                  key={`${w.t}-${idx}`}
                  className="flex items-center justify-between rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] border border-[#4d7c49]/40 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    <ArrowDownLeft className="w-4 h-4 text-[#0f7a35] dark:text-[#6ee7a0]" />
                    <span className="font-semibold">
                      {w.m} · {w.t}
                    </span>
                  </div>
                  <span className="font-mono-num text-sm font-bold">
                    -{formatRupiah(w.n)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DrawerModal>
  );
};

interface OrderDetailModalProps {
  order: Order | null;
  users: User[];
  onClose: () => void;
  onOpenReceipt: (id: number) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  users,
  onClose,
  onOpenReceipt,
}) => {
  if (!order) return null;
  const code = `ET-${String(order.id).slice(-6)}`;
  const finalKg = order.final ?? order.berat;
  const estOrTotal = order.total ?? order.est;

  return (
    <DrawerModal
      open={!!order}
      onClose={onClose}
      title={`Detail ${code}`}
      maxWidthClass="md:max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#e9f1e8] dark:bg-[#1a2b1f] flex items-center justify-center text-[#102916] dark:text-[#8be69c]">
              <WasteIcon categoryId={order.jid} className="w-6 h-6" />
            </div>
            <span className="text-lg font-extrabold">{order.jenis}</span>
          </div>
          <span className="rounded-full bg-[#e9f1e8] dark:bg-[#1a2b1f] px-3.5 py-1 text-xs font-bold">
            {order.status}
          </span>
        </div>

        {/* 3 green breakdown bars matching Figma Screenshot 1 Screen 4 */}
        <div className="space-y-2.5">
          <div className="rounded-xl bg-[#6ea36c] dark:bg-[#234529] text-white px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold">
            <span>Pengepul &amp; Metode</span>
            <span className="text-right">
              {getUserDisplayName(users, order.to, order.toName)} · {order.metode}
            </span>
          </div>
          {order.metode === 'Dijemput' && order.alamat && (
            <div className="rounded-xl bg-[#6ea36c] dark:bg-[#234529] text-white px-4 py-3 flex items-start justify-between gap-3 text-xs font-semibold">
              <span className="shrink-0">Alamat Jemput</span>
              <span className="text-right">{order.alamat}</span>
            </div>
          )}
          <div className="rounded-xl bg-[#6ea36c] dark:bg-[#234529] text-white px-4 py-3 flex items-center justify-between text-xs font-semibold">
            <span>Berat &amp; Tanggal</span>
            <span className="font-mono-num">
              {finalKg} kg · {order.tgl}
            </span>
          </div>
          <div className="rounded-xl bg-[#6ea36c] dark:bg-[#234529] text-white px-4 py-3 flex items-center justify-between text-xs font-semibold">
            <span>{order.status === 'Selesai' ? 'Total Harga' : 'Estimasi Harga'}</span>
            <span className="font-mono-num font-bold">
              {formatRupiah(estOrTotal)}
              {order.ongkir > 0 ? ` (-Ongkir ${formatRupiah(order.ongkir)})` : ''}
            </span>
          </div>
        </div>

        {order.status === 'Selesai' ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenReceipt(order.id);
            }}
            className="w-full min-h-[46px] rounded-full bg-[#e9f1e8] dark:bg-[#1a2b1f] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Lihat Struk Digital
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] rounded-full bg-[#e9f1e8] dark:bg-[#1a2b1f] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Tutup
          </button>
        )}
      </div>
    </DrawerModal>
  );
};

interface ReceiptModalProps {
  order: Order | null;
  users: User[];
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  users,
  onClose,
}) => {
  if (!order) return null;
  const finalWeight = order.final ?? order.berat;
  const totalAmount = order.total ?? order.est;
  const unitPrice =
    finalWeight > 0 ? totalAmount / finalWeight : getOrderUnitPrice(order);
  const netReceived = totalAmount - order.ongkir;

  return (
    <DrawerModal
      open={!!order}
      onClose={onClose}
      title="Struk Digital"
      subtitle={`Bukti transaksi #ET-${String(order.id).slice(-6)}`}
      maxWidthClass="md:max-w-md"
    >
      <div className="rounded-2xl border-2 border-dashed border-[#4d7c49] bg-[#e9f1e8] dark:bg-[#1a2b1f] p-4 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="opacity-75">No. Bukti</span>
          <span className="font-mono-num font-bold">ET-{String(order.id).slice(-6)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Tanggal</span>
          <span>{order.tgl}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Pengumpul</span>
          <span className="font-semibold">{getUserDisplayName(users, order.by, order.byName)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Pengepul</span>
          <span className="font-semibold">{getUserDisplayName(users, order.to, order.toName)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Jenis sampah</span>
          <span className="font-semibold">{order.jenis}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Berat timbang</span>
          <span className="font-mono-num">{finalWeight} kg</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Harga/kg</span>
          <span className="font-mono-num">{formatRupiah(unitPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Ongkir jemput</span>
          <span className="font-mono-num">-{formatRupiah(order.ongkir)}</span>
        </div>
        <div className="pt-2.5 border-t border-dashed border-[#4d7c49] flex justify-between items-center">
          <span className="font-bold">Diterima pengumpul</span>
          <span className="font-mono-num text-base font-extrabold text-[#0f7a35] dark:text-[#6ee7a0]">
            {formatRupiah(netReceived)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full min-h-[44px] rounded-full bg-[#e9f1e8] dark:bg-[#1a2b1f] font-bold text-sm hover:opacity-90 transition-opacity"
      >
        Tutup
      </button>
    </DrawerModal>
  );
};

interface RatingModalProps {
  order: Order | null;
  users: User[];
  onRate: (orderId: number, rating: number) => void;
  onClose: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  order,
  users,
  onRate,
  onClose,
}) => {
  if (!order) return null;

  return (
    <DrawerModal
      open={!!order}
      onClose={onClose}
      title="Beri Nilai Pengepul"
      subtitle={`Bagaimana pelayanan dan timbangan dari ${getUserDisplayName(users, order.to, order.toName)}?`}
      maxWidthClass="md:max-w-md"
    >
      <div className="grid grid-cols-5 gap-2 py-3">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onRate(order.id, num)}
            aria-label={`${num} bintang`}
            className="min-h-[56px] rounded-2xl border border-[#4d7c49] bg-[#e9f1e8] dark:bg-[#1a2b1f] hover:bg-white flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span className="font-mono-num text-xs font-bold">{num}</span>
          </button>
        ))}
      </div>
    </DrawerModal>
  );
};
