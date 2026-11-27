export type Role = 'pengumpul' | 'pengepul';

export type OrderStatus = 'Menunggu' | 'Selesai' | 'Ditolak';

export type DepositMethod = 'Antar sendiri' | 'Dijemput';

export type SortOrder = 'jarak' | 'rating' | 'harga';

export type LedgerAccountKey = 'Persediaan' | 'Kas' | 'Jemput';

export interface WasteCategory {
  id: number;
  name: string;
  defaultPrice: number;
  shortDesc: string;
}

export interface DeliverySettings {
  terimaAntar: boolean;
  terimaJemput: boolean;
  ongkirJemput: number;
  catatan?: string;
}

export interface User {
  id: string;
  nama: string;
  usaha?: string;
  alamat?: string;
  area?: string;
  email: string;
  pass: string;
  role: Role;
  saldo: number;
  bank: string;
  rek: string;
  harga?: number[];
  jarak?: number;
  rs?: number;
  rn?: number;
  pengiriman?: DeliverySettings;
}

export interface Order {
  id: number;
  docId?: string;
  by: string;
  byName?: string;
  to: string;
  toName?: string;
  jenis: string;
  jid: number;
  berat: number;
  hrg: number;
  est: number;
  final?: number;
  total?: number;
  metode: DepositMethod;
  alamat: string;
  ongkir: number;
  status: OrderStatus;
  tgl: string;
  rate?: number;
}

export interface PengepulRatingRecord {
  id: string;
  pengepulId: string;
  orderId: string;
  by: string;
  rate: number;
}

export interface Withdrawal {
  u: string;
  m: string;
  n: number;
  t: string;
}

export interface TopupRecord {
  u: string;
  metode: string;
  n: number;
  t: string;
}

export interface EcotingDB {
  users: User[];
  orders: Order[];
  session: string | null;
  wd: Withdrawal[];
  topups?: TopupRecord[];
}

export interface LedgerEntry {
  t: string;
  b: string;
  k: string;
  d: number;
  c: number;
}
