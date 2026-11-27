import type {
  DeliverySettings,
  EcotingDB,
  Order,
  User,
  WasteCategory,
} from '../types/ecoting';

export const WASTE_CATEGORIES: WasteCategory[] = [
  { id: 0, name: 'Botol plastik', defaultPrice: 3500, shortDesc: 'PET bersih tanpa tutup' },
  { id: 1, name: 'Botol kaca', defaultPrice: 1000, shortDesc: 'Kaca utuh tidak pecah' },
  { id: 2, name: 'Kaleng', defaultPrice: 5000, shortDesc: 'Aluminium & kaleng minuman' },
  { id: 3, name: 'Kertas/kardus', defaultPrice: 2000, shortDesc: 'Kering & terikat rapi' },
  { id: 4, name: 'Plastik lain', defaultPrice: 1500, shortDesc: 'PP, HDPE & kemasan bersih' },
];

export const PICKUP_FEE = 3000;

export const BANK_OPTIONS = [
  'BCA',
  'BRI',
  'BNI',
  'Mandiri',
  'GoPay',
  'OVO',
  'DANA',
  'ShopeePay',
] as const;

const STORAGE_KEY = 'ecoting';

export function seedDatabase(): EcotingDB {
  return {
    users: [
      {
        id: 'u1',
        nama: 'Dina Mahasiswa',
        email: 'mahasiswa@demo.id',
        pass: 'demo123',
        role: 'pengumpul',
        saldo: 25000,
        bank: 'BCA',
        rek: '1234567890',
      },
      {
        id: 'u2',
        nama: 'Budi Santoso',
        usaha: 'Bank Sampah Tembalang',
        email: 'pengepul@demo.id',
        pass: 'demo123',
        role: 'pengepul',
        saldo: 250000,
        bank: 'BRI',
        rek: '0987654321',
        harga: [3500, 1000, 5000, 2000, 1500],
        jarak: 0.8,
        rs: 4.8,
        rn: 127,
        pengiriman: {
          terimaAntar: true,
          terimaJemput: true,
          ongkirJemput: 3000,
          catatan: 'Senin–Sabtu 08.00–17.00 · Area Tembalang',
        },
      },
      {
        id: 'u3',
        nama: 'Slamet Hartono',
        usaha: 'Pak Slamet Rongsok',
        email: 'slamet@demo.id',
        pass: 'demo123',
        role: 'pengepul',
        saldo: 250000,
        bank: 'DANA',
        rek: '081234567890',
        harga: [3200, 0, 5500, 1800, 0],
        jarak: 1.6,
        rs: 4.5,
        rn: 64,
        pengiriman: {
          terimaAntar: true,
          terimaJemput: true,
          ongkirJemput: 3000,
          catatan: 'Setiap hari 07.30–16.30',
        },
      },
    ],
    orders: [],
    session: null,
    wd: [],
    topups: [],
  };
}

export function loadDatabase(): EcotingDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EcotingDB;
      if (parsed && Array.isArray(parsed.users)) {
        parsed.users.forEach((u) => {
          if (u.role === 'pengepul' && !u.harga) {
            u.harga = WASTE_CATEGORIES.map((c) => c.defaultPrice);
          }
          if (u.role === 'pengepul' && u.jarak == null) {
            const defaults: Record<string, [number, number, number]> = {
              u2: [0.8, 4.8, 127],
              u3: [1.6, 4.5, 64],
            };
            const fallback: [number, number, number] = [
              +(0.5 + Math.random() * 2.5).toFixed(1),
              0,
              0,
            ];
            const m = defaults[u.id] || fallback;
            u.jarak = m[0];
            u.rs = m[1];
            u.rn = m[2];
          }
          if (u.role === 'pengepul' && !u.usaha) {
            u.usaha = u.nama;
          }
          if (u.role === 'pengepul' && !u.pengiriman) {
            u.pengiriman = {
              terimaAntar: true,
              terimaJemput: true,
              ongkirJemput: PICKUP_FEE,
            };
          }
          if (!u.bank) u.bank = '';
          if (!u.rek) u.rek = '';
        });
        if (!Array.isArray(parsed.orders)) parsed.orders = [];
        if (!Array.isArray(parsed.wd)) parsed.wd = [];
        if (!Array.isArray(parsed.topups)) parsed.topups = [];
        return parsed;
      }
    }
  } catch {
    // Fallback to seed when localStorage is corrupted
  }
  return seedDatabase();
}

export function saveDatabase(db: EcotingDB): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatRupiah(amount: number): string {
  return 'Rp' + Math.round(amount).toLocaleString('id-ID');
}

export function getDisplayName(user: User): string {
  return user.role === 'pengepul' && user.usaha ? user.usaha : user.nama;
}

export function getUserDisplayName(
  users: User[],
  id: string,
  fallbackName?: string,
): string {
  const found = users.find((u) => u.id === id);
  if (found) return getDisplayName(found);
  return fallbackName || '-';
}

export function getUserOrders(orders: Order[], user: User): Order[] {
  return orders
    .filter((o) => (user.role === 'pengumpul' ? o.by === user.id : o.to === user.id))
    .sort((a, b) => b.id - a.id);
}

export function getAcceptedCategoryIds(pengepul: User): number[] {
  const ids: number[] = [];
  WASTE_CATEGORIES.forEach((cat, idx) => {
    if (pengepul.harga && pengepul.harga[idx] > 0) {
      ids.push(idx);
    }
  });
  return ids;
}

export function getDeliverySettings(pengepul: User): DeliverySettings {
  return {
    terimaAntar: pengepul.pengiriman?.terimaAntar ?? true,
    terimaJemput: pengepul.pengiriman?.terimaJemput ?? true,
    ongkirJemput: pengepul.pengiriman?.ongkirJemput ?? PICKUP_FEE,
    catatan: pengepul.pengiriman?.catatan,
  };
}

export function formatDeliverySummary(pengepul: User): string {
  const cfg = getDeliverySettings(pengepul);
  const parts: string[] = [];
  if (cfg.terimaAntar) parts.push('Antar sendiri');
  if (cfg.terimaJemput) {
    parts.push(
      cfg.ongkirJemput > 0
        ? `Dijemput (${formatRupiah(cfg.ongkirJemput)})`
        : 'Dijemput (Gratis)',
    );
  }
  return parts.length ? parts.join(' · ') : 'Antar sendiri';
}

export function getOrderUnitPrice(order: Order): number {
  return order.hrg || (order.berat > 0 ? order.est / order.berat : 0);
}

export function getPengepulRating(
  pengepul: User,
  orders: Order[],
  publicRatings?: { pengepulId: string; orderId: string; rate: number }[],
): { avg: number; count: number } {
  let sum = (pengepul.rs || 0) * (pengepul.rn || 0);
  let count = pengepul.rn || 0;

  if (publicRatings && publicRatings.length > 0) {
    const matched = publicRatings.filter((r) => r.pengepulId === pengepul.id);
    matched.forEach((r) => {
      sum += r.rate;
      count += 1;
    });
  } else {
    orders.forEach((o) => {
      if (o.to === pengepul.id && o.rate) {
        sum += o.rate;
        count += 1;
      }
    });
  }

  return {
    avg: count > 0 ? sum / count : 0,
    count,
  };
}
