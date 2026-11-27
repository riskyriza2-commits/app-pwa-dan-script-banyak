# ECO-TING Firestore Security Specification

## 1. Data Invariants
1. **User PII Isolation**: `/users/{userId}` holds email, home address, bank, and account number. Only `request.auth.uid == userId` may read or update their own user document. `role` (`pengumpul` or `pengepul`) and `uid` are immutable after registration.
2. **Public Storefront Separation**: `/pengepul/{pengepulId}` exposes only non-PII business details (`usaha`, `picName`, `area`, `harga`, `jarak`, `pengiriman`, `rs`, `rn`) and can only be created or updated by `pengepulId == request.auth.uid` whose user profile has `role == 'pengepul'`.
3. **Order Integrity & Privacy**: `/orders/{orderId}` can only be created by a verified user with `by == request.auth.uid`, `status == 'Menunggu'`, `by != to`, and an existing `/pengepul/{to}` target. Only the creator (`by`) or recipient (`to`) may `get` or `list` an order.
4. **Tiered Action & Terminal State Locking**: Only `to` (pengepul) may transition an order from `'Menunggu'` to `'Selesai'` (setting `final`, `total`) or `'Ditolak'`. Once `'Selesai'` or `'Ditolak'`, status and financial fields are permanently locked. Only `by` (pengumpul) may set `rate` (1–5) once after `status == 'Selesai'`.
5. **Verified Ratings**: `/pengepul/{pengepulId}/ratings/{ratingId}` requires `ratingId == orderId` and verifies the referenced order exists, belongs to `by == request.auth.uid` and `to == pengepulId`, and has `status == 'Selesai'`.
6. **Immutable Withdrawals**: `/withdrawals/{withdrawalId}` may only be read and created by `userId == request.auth.uid` with `n >= 10000` and cannot be updated or deleted.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **User PII Cross-Read**: User B calls `get(/users/userA)` -> DENIED (`userId != request.auth.uid`).
2. **User Role Escalation**: User A updates `/users/userA` with `{ role: 'pengepul' }` -> DENIED (`role` immutable / not in `affectedKeys`).
3. **Ghost Field Injection on User**: User A creates `/users/userA` with extra field `{ isAdmin: true }` -> DENIED (`keys().hasOnly(...)`).
4. **Unverified Email Write**: Authenticated user with `email_verified: false` creates `/users/userA` -> DENIED (`isEmailVerified()`).
5. **Spoofed Pengepul Storefront**: User with `role == 'pengumpul'` creates `/pengepul/userA` -> DENIED (`get(/users/userA).data.role == 'pengepul'`).
6. **Impersonated Order Creation**: User B creates `/orders/o1` with `{ by: 'userA', to: 'pengepul1', status: 'Menunggu' }` -> DENIED (`by == request.auth.uid`).
7. **Orphan Order Target**: User A creates `/orders/o2` with `{ to: 'nonexistent-pengepul' }` -> DENIED (`exists(/pengepul/$(to))`).
8. **Pre-Approved Order Injection**: User A creates `/orders/o3` with `{ status: 'Selesai', total: 999999 }` -> DENIED (`status == 'Menunggu'`).
9. **Blanket Order List Scraping**: User C runs `list(/orders)` without `where('by', '==', 'userC')` or `where('to', '==', 'userC')` -> DENIED (`allow list` requires `resource.data.by == uid || resource.data.to == uid`).
10. **Terminal State Re-Mutation**: Pengepul updates `/orders/o4` where `existing().status == 'Selesai'` to change `total` or `status` -> DENIED (`existing().status == 'Menunggu'`).
11. **Pengumpul Self-Approval**: Pengumpul updates `/orders/o5` to `{ status: 'Selesai', total: 500000 }` -> DENIED (`existing().to == request.auth.uid`).
12. **Fake Rating Without Order**: User A creates `/pengepul/pengepul1/ratings/fake1` with nonexistent `orderId` -> DENIED (`exists(/orders/$(orderId))` and `status == 'Selesai'`).
