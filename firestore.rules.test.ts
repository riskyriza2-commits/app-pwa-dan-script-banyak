/**
 * Phase 0: Dirty Dozen Payload Security Suite for ECO-TING Firestore Rules.
 * Verifies all 12 adversarial payloads against the Eight Pillars constraints.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actorUid: string;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update';
  path: string;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcingGate: string;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'User PII Cross-Read',
    actorUid: 'userB',
    emailVerified: true,
    operation: 'get',
    path: '/users/userA',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'isOwner(userId) on /users/{userId}',
  },
  {
    id: 2,
    name: 'User Role Escalation',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'update',
    path: '/users/userA',
    payload: { role: 'pengepul' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().role == existing().role && affectedKeys().hasOnly(...)',
  },
  {
    id: 3,
    name: 'Ghost Field Injection on User',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/users/userA',
    payload: {
      uid: 'userA',
      nama: 'User A',
      role: 'pengumpul',
      email: 'a@demo.id',
      alamat: 'Tembalang',
      bank: 'BCA',
      rek: '12345678',
      isAdmin: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'isValidUser() keys().hasOnly(...)',
  },
  {
    id: 4,
    name: 'Unverified Email Write',
    actorUid: 'userA',
    emailVerified: false,
    operation: 'create',
    path: '/users/userA',
    payload: { uid: 'userA', nama: 'User A', role: 'pengumpul' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'isEmailVerified() requires request.auth.token.email_verified == true',
  },
  {
    id: 5,
    name: 'Spoofed Pengepul Storefront',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/pengepul/userA',
    payload: { ownerId: 'userA', usaha: 'Fake Bank Sampah' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "get(/users/$(request.auth.uid)).data.role == 'pengepul'",
  },
  {
    id: 6,
    name: 'Impersonated Order Creation',
    actorUid: 'userB',
    emailVerified: true,
    operation: 'create',
    path: '/orders/order1',
    payload: { by: 'userA', to: 'pengepul1', status: 'Menunggu' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().by == request.auth.uid',
  },
  {
    id: 7,
    name: 'Orphan Order Target',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/orders/order2',
    payload: { by: 'userA', to: 'nonexistent-pengepul', status: 'Menunggu' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'exists(/pengepul/$(incoming().to))',
  },
  {
    id: 8,
    name: 'Pre-Approved Order Injection',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/orders/order3',
    payload: { by: 'userA', to: 'pengepul1', status: 'Selesai', total: 999999 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "incoming().status == 'Menunggu' && !('total' in incoming())",
  },
  {
    id: 9,
    name: 'Blanket Order List Scraping',
    actorUid: 'userC',
    emailVerified: true,
    operation: 'list',
    path: '/orders',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'allow list: existing().by == uid || existing().to == uid',
  },
  {
    id: 10,
    name: 'Terminal State Re-Mutation',
    actorUid: 'pengepul1',
    emailVerified: true,
    operation: 'update',
    path: '/orders/order4',
    payload: { status: 'Ditolak' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "existing().status == 'Menunggu' before Approve/Reject",
  },
  {
    id: 11,
    name: 'Pengumpul Self-Approval',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'update',
    path: '/orders/order5',
    payload: { status: 'Selesai', final: 100, total: 500000 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'existing().to == request.auth.uid for Approve/Reject',
  },
  {
    id: 12,
    name: 'Fake Rating Without Completed Order',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/pengepul/pengepul1/ratings/fakeOrder',
    payload: { pengepulId: 'pengepul1', orderId: 'fakeOrder', by: 'userA', rate: 5 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "exists(/orders/$(ratingId)) && status == 'Selesai'",
  },
];
