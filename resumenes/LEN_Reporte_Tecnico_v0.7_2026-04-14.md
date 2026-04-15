# LEN — Reporte Técnico v0.7
**Fecha:** 2026-04-14  
**Autor:** Claude Sonnet 4.6 (sesión de ingeniería)  
**Estado:** Post-fixes sesión 3 — commit 90302b5

---

## 1. Arquitectura general

```
MONDEGA/
├── apps/
│   ├── web/          → App de usuario (Next.js 14, Railway: web-production-1c372.up.railway.app)
│   ├── admin/        → Panel administrativo (Next.js 14, Railway: pendiente deploy)
│   └── mobile/       → App móvil (Expo/React Native, no revisada en esta sesión)
├── packages/         → Packages compartidos (tipos, utils)
└── resumenes/        → Reportes técnicos
```

### Stack web + admin
- **Next.js 14** App Router, TypeScript, Tailwind CSS 3.4
- **Zustand** — stores persistidos en localStorage (auth, wallet, bank, admin)
- **Firebase Firestore** — sincronización cross-device en tiempo real
- **Railway** — deploy via Nixpacks desde rama `main`

---

## 2. Inventario de módulos — apps/web

| Ruta | Archivo | Estado |
|------|---------|--------|
| `/` | `(app)/page.tsx` | ✅ Funcional (dashboard) |
| `/send` | `(app)/send/page.tsx` | ✅ Funcional (demo users, nota de pruebas añadida) |
| `/receive` | `(app)/receive/page.tsx` | ✅ Funcional |
| `/deposit` | `(app)/deposit/page.tsx` | ✅ Funcional |
| `/withdraw` | `(app)/withdraw/page.tsx` | ✅ Funcional |
| `/bank-accounts` | `(app)/bank-accounts/page.tsx` | ✅ **NUEVO** — creado en sesión 3 |
| `/transactions` | `(app)/transactions/page.tsx` | ✅ Filtros: todos/envíos/depósitos/retiros |
| `/kyc` | `(app)/kyc/page.tsx` | ✅ Reescrito — sin llamada API colgada |
| `/settings` | `(app)/settings/page.tsx` | ✅ Link admin → URL externa |
| `/exchange` | `(app)/exchange/page.tsx` | ⚠️ Parcial (UI completa, lógica pendiente) |
| `/card` | `(app)/card/page.tsx` | 🔒 "Próximamente" |
| `/notifications` | `(app)/notifications/page.tsx` | 🔒 "Próximamente" |
| `/security` | `(app)/security/page.tsx` | ⚠️ Parcial |
| `/login` | `(auth)/login/page.tsx` | ✅ Funcional con sync Firestore |
| `/register` | `(auth)/register/page.tsx` | ⚠️ UI lista, no conectada a backend |

---

## 3. Inventario de módulos — apps/admin

| Ruta | Archivo | Estado |
|------|---------|--------|
| `/` | `src/app/page.tsx` | ✅ Panel completo migrado desde web |
| `/users` | `src/app/users/page.tsx` | ✅ Tabla de usuarios |
| `/kyc-review` | `src/app/kyc-review/page.tsx` | ✅ Cola KYC |
| `/alerts` | `src/app/alerts/page.tsx` | ✅ Alertas AML |
| Layout | `src/app/layout.tsx` | ✅ LoginGate + Sidebar oscuro |
| Store | `src/store/admin.store.ts` | ✅ Copiado desde web app |

**Password admin:** `len2025`  
**Deploy pendiente:** Configurar nuevo servicio en Railway apuntando a `apps/admin/`

---

## 4. Stores Zustand

| Store | Archivo | Persistencia | Sincronización |
|-------|---------|-------------|----------------|
| `useAuthStore` | `store/auth.store.ts` | localStorage | No (solo local) |
| `useWalletStore` | `store/wallet.store.ts` | localStorage | ✅ Firestore (onSnapshot) |
| `useBankStore` | `store/bank.store.ts` | localStorage | ✅ Firestore (sesión 2) |
| `useAdminStore` | `store/admin.store.ts` | localStorage | No (solo local) |

---

## 5. Flujos completos

### 5.1 Login con sincronización
```
Usuario → /login
  → demoLogin() o handleLogin()
  → loadUserSnapshot(userId) desde Firestore
  → setWallets(), setTransactions() en useWalletStore
  → useBankStore.setState({ accounts }) ← NUEVO sesión 2
  → startWalletSync(userId) → onSnapshot en tiempo real
  → router.push('/')
```

### 5.2 Recarga en página autenticada
```
Cualquier página (app)/
  → layout.tsx detecta hydrated + isAuthenticated
  → syncFromFirestore(userId) ← NUEVO sesión 2
  → startWalletSync(userId)
  → Todos los datos sincronizados sin re-login
```

### 5.3 Envío de tokens
```
/send
  → Seleccionar usuario destinatario (demo: demo-gt, demo-mx, demo-hn)
  → Seleccionar token (QUETZA/MEXCOIN/LEMPI)
  → Ingresar monto
  → addTransaction() → scheduleSave() → Firestore
  → Confirmación + historial actualizado
```

### 5.4 Retiro a banco
```
/withdraw
  → Seleccionar cuenta bancaria (desde bank.store)
  → Ingresar monto
  → addTransaction(type: 'fiat_withdraw')
  → scheduleSave() → Firestore (incluye bankAccounts)
  → Se refleja en /transactions con filtro "Retiros"
```

### 5.5 KYC
```
/kyc
  → Lee user.kycLevel desde useAuthStore (sin API)
  → Muestra niveles 0-3 con documentos requeridos
  → Botón "Iniciar verificación" → "Próximamente"
  → Sin spinner infinito
```

---

## 6. Modelo de datos Firestore

**Colección:** `len_demo_users/{userId}`

```typescript
interface UserSnapshot {
  wallets: WalletBalance[];        // [{ token, balance, fiatValue, currency }]
  transactions: Transaction[];     // [{ id, type, amount, ... }]
  bankAccounts?: BankAccount[];    // ← NUEVO sesión 2
  updatedAt: string;               // ISO timestamp
  updatedBy?: string;              // userId
}
```

**Usuarios demo:**
- `demo-gt` → QUETZA (GTQ), Guatemala
- `demo-mx` → MEXCOIN (MXN), México  
- `demo-hn` → LEMPI (HNL), Honduras

---

## 7. Bugs resueltos en sesiones 2 y 3

| ID | Bug | Solución | Commit |
|----|-----|----------|--------|
| BUG-001 | Cuentas bancarias no sincronizaban cross-device | `bankAccounts` en UserSnapshot + suscripción en wallet-sync | c07acbf |
| BUG-002 | Recarga de página perdía datos (no re-login) | `syncFromFirestore()` en `(app)/layout.tsx` | c07acbf |
| BUG-003 | KYC page colgada en loading infinito | Reescritura sin llamada API; lee desde authStore | be94b06 |
| BUG-004 | Números grandes overflow en móvil | `fmtShort()` con abreviación K/M en BalanceCard | be94b06 |
| BUG-005 | `/bank-accounts` = 404 | Página creada desde cero | 90302b5 |
| BUG-006 | Panel admin en `apps/web` (arquitectura incorrecta) | Migrado a `apps/admin` (app separada) | 90302b5 |
| BUG-007 | Filtro de retiros inexistente en historial | Filtro `'withdraw'` → `fiat_withdraw` añadido | be94b06 |
| BUG-008 | Usuarios demo en /send sin contexto | Caja "🧪 Módulo de pruebas" con nota explicativa | be94b06 |
| BUG-009 | Colores CSS no actualizaban en deploy | CSS custom properties + `!important` en globals.css | be94b06 |
| BUG-010 | `mondega-green` clases rotas en KYC | Reemplazadas por clases `len-*` en reescritura KYC | be94b06 |

---

## 8. Bugs pendientes / conocidos

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| BUG-011 | `/register` no conectada a backend real | Media |
| BUG-012 | Firestore security rules abiertas (allow all) | Alta — antes de producción real |
| BUG-013 | VAPID key faltante para push notifications | Baja (push pendiente por decisión) |
| BUG-014 | `apps/admin` no deployado en Railway aún | Media — configurar servicio |
| BUG-015 | `/exchange` lógica incompleta | Media |
| BUG-016 | Settings admin link apunta a URL hardcodeada no final | Baja — actualizar cuando admin esté deployado |

---

## 9. Pendientes de deploy

### apps/web (Railway — activo)
- Todos los fixes de sesiones 2 y 3 incluidos en rama `main`
- Próximo deploy incluirá: /bank-accounts, KYC reescrito, admin removido, sync fixes

### apps/admin (Railway — pendiente)
1. Crear nuevo servicio en Railway
2. Apuntar a `apps/admin/` como root
3. Configurar Nixpacks: `cd apps/admin && pnpm install && pnpm build`
4. Actualizar URL en settings/page.tsx (reemplazar `https://len-admin.up.railway.app`)

---

## 10. Variables de entorno requeridas

| Variable | App | Estado |
|----------|-----|--------|
| `NEXT_PUBLIC_FIREBASE_*` | web, admin | ✅ Configuradas en Railway |
| `NEXT_PUBLIC_API_URL` | web | ✅ Configurada |
| `VAPID_PUBLIC_KEY` | web | ❌ Faltante (push pendiente) |

---

## 11. Tokens LEN

| Token | País | Divisa | Peg |
|-------|------|--------|-----|
| QUETZA | Guatemala | GTQ | 1:1 |
| MEXCOIN | México | MXN | 1:1 |
| LEMPI | Honduras | HNL | 1:1 |

---

## 12. Notas de arquitectura

- **Admin separado por diseño**: El panel admin (`apps/admin`) corre en un puerto/dominio distinto al app de usuarios (`apps/web`). Esto aísla las funciones administrativas y permite deploy independiente.
- **Demo mode**: Toda la app funciona con datos demo. Los usuarios `demo-gt/mx/hn` están hardcodeados en el login y en el admin store.
- **Firestore = source of truth**: localStorage es caché local. Al recargar o en otro dispositivo, `syncFromFirestore()` sobreescribe el estado local con la versión de Firestore.
- **Push notifications**: Deliberadamente pospuestas. Infraestructura (service worker) existe pero sin VAPID keys ni triggers.
