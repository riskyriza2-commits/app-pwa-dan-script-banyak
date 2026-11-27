import React from 'react';
import { Star, Receipt, MapPin } from 'lucide-react';
import type { Order, User } from '../types/ecoting';
import { formatRupiah, getUserDisplayName } from '../data/ecotingStore';

interface OrderCardProps {
  order: Order;
  users: User[];
  isCollectorView: boolean;
  onOpenReceipt: (orderId: number) => void;
  onOpenRate?: (orderId: number) => void;
  onOpenVerify?: (orderId: number) => void;
  onOpenDetail?: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  users,
  isCollectorView,
  onOpenReceipt,
  onOpenRate,
  onOpenVerify,
  onOpenDetail,
}) => {
  const counterpart = isCollectorView
    ? `Ke ${getUserDisplayName(users, order.to, order.toName)}`
    : `Dari ${getUserDisplayName(users, order.by, order.byName)}`;

  const statusBadge = () => {
    if (order.status === 'Selesai') {
      return (
        <span className="inline-flex items-center rounded-full bg-[#cdf1d9] text-[#0b5a28] px-3 py-1 text-[11px] font-bold shrink-0">
          Selesai
        </span>
      );
    }
    if (order.status === 'Ditolak') {
      return (
        <span className="inline-flex items-center rounded-full bg-[#fbd5d2] text-[#8a1c16] px-3 py-1 text-[11px] font-bold shrink-0">
          Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-[#e6d74f] text-[#3a3300] px-3 py-1 text-[11px] font-bold shrink-0">
        Menunggu
      </span>
    );
  };

  return (
    <div className="rounded-3xl bg-[#b9dbb6]/70 dark:bg-[#192b1f] border-2 border-[#4d7c49] dark:border-[#2e5237] p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`min-w-0 flex-1 ${onOpenDetail ? 'cursor-pointer' : ''}`}
          onClick={() => onOpenDetail?.(order)}
        >
          <p className="font-bold text-sm text-[#102916] dark:text-[#e8f3ec] truncate">
            {order.jenis} -{' '}
            <span className="font-mono-num">
              {order.status === 'Selesai' && order.final ? order.final : order.berat} kg
            </span>
          </p>
          <p className="text-xs text-[#264b2c] dark:text-[#a8c7af] mt-1">
            {counterpart}
          </p>
          <p className="text-[11px] text-[#335a39] dark:text-[#8eb096] mt-0.5">
            {order.metode} · {order.tgl}
          </p>
          {order.metode === 'Dijemput' && order.alamat && (
            <p className="text-[11px] text-[#264b2c] dark:text-[#a8c7af] mt-0.5 flex items-start gap-1">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-[#0f7a35] dark:text-[#6ee7a0]" />
              <span className="line-clamp-2">{order.alamat}</span>
            </p>
          )}
          <p className="text-xs font-semibold text-[#102916] dark:text-[#e8f3ec] mt-1">
            {order.status === 'Selesai' && order.total != null ? (
              <span className="font-mono-num font-extrabold">
                Total {formatRupiah(order.total)}
              </span>
            ) : (
              <span>
                Estimasi{' '}
                <span className="font-mono-num font-bold">
                  {formatRupiah(order.est)}
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {statusBadge()}

          {!isCollectorView && order.status === 'Menunggu' && onOpenVerify && (
            <button
              type="button"
              onClick={() => onOpenVerify(order.id)}
              className="rounded-full bg-[#2b6b2b] hover:bg-[#1f551f] text-white px-4 py-1.5 min-h-[34px] text-xs font-bold transition-colors whitespace-nowrap"
            >
              Verifikasi
            </button>
          )}

          {order.status === 'Selesai' && (
            <div className="flex items-center gap-1.5">
              {isCollectorView &&
                (order.rate ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="font-mono-num">{order.rate}/5</span>
                  </span>
                ) : (
                  onOpenRate && (
                    <button
                      type="button"
                      onClick={() => onOpenRate(order.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-[#15211a] border border-[#4d7c49] px-3 py-1 text-[11px] font-bold hover:bg-white transition-colors"
                    >
                      <Star className="w-3 h-3 text-amber-500" />
                      <span>Nilai</span>
                    </button>
                  )
                ))}

              <button
                type="button"
                onClick={() => onOpenReceipt(order.id)}
                className="inline-flex items-center gap-1 rounded-full bg-[#2b6b2b] hover:bg-[#1f551f] text-white px-3 py-1 text-[11px] font-bold transition-colors whitespace-nowrap"
              >
                <Receipt className="w-3 h-3" />
                <span>Struk</span>
              </button>
            </div>
          )}

          {isCollectorView && onOpenDetail && order.status === 'Menunggu' && (
            <button
              type="button"
              onClick={() => onOpenDetail(order)}
              className="rounded-full bg-white/85 dark:bg-[#15211a] border border-[#4d7c49] px-3 py-1 text-[11px] font-bold text-[#102916] dark:text-[#e8f3ec]"
            >
              Detail
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
