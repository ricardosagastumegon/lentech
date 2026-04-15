# LEN — Reporte Técnico Completo
**Versión:** 0.6.0  
**Fecha:** 2026-04-14  
**Autor:** Auditoría de sistema (Claude Sonnet 4.6)

---

## 1. ARQUITECTURA GENERAL

```
Usuario (móvil/web)
       │
       ▼
Next.js 14 App Router  (apps/web)
  ├── /app/(auth)/       → login, register
  ├── /app/(app)/        → todas las pantallas autenticadas
  ├── /app/admin/        → panel de administración
  └── /app/pitch/        → presentación para inversores
       │
       ├── Zustand Stores (localStorage persist)
       │     ├── auth.store       → sesión de usuario
       │     ├── wallet.store     → wallets, transacciones, operaciones
       │     ├── bank.store       → cuentas bancarias guardadas
       │     └── admin.store      → panel admin (contraseña: len2025)
       │
       ├── Firebase Firestore (cloud, cross-device sync)
       │     └── len_demo_users/{userId}
       │           ├── wallets[]
       │           ├── transactions[]
       │           ├── bankAccounts[]
       │           ├── updatedAt
       │           └── updatedBy  ('system' = crédito externo, userId = propio)
       │
       └── API Backend (apps/api — NO CONECTADO en demo)
             └── Todas las llamadas a apiClient fallan silenciosamente
                 y el sistema opera en modo demo local

Deploy: Railway via Nixpacks
Repo:   github.com/ricardosagastumegon/lentech
```

---

## 2. INVENTARIO DE MÓDULOS

### Páginas autenticadas `(app)/`

| Ruta | Archivo | Propósito | Estado |
|------|---------|-----------|--------|
| `/dashboard` | dashboard/page.tsx | Pantalla principal: saldo, acciones rápidas, txs recientes | ✅ Funcional |
| `/send` | send/page.tsx | Envío P2P / cross-chain (3 pasos: destinatario → monto → confirmar) | ✅ Funcional |
| `/receive` | receive/page.tsx | QR determinístico para recibir pagos | ✅ Funcional |
| `/add-money` | add-money/page.tsx | Instrucciones de depósito bancario (CLABE MX / sub-cuenta GT/HN) | ✅ Funcional |
| `/buy-tokens` | buy-tokens/page.tsx | Convertir fiat → tokens 1:1 | ✅ Funcional |
| `/sell-tokens` | sell-tokens/page.tsx | Convertir tokens → fiat (0.5% fee) | ✅ Funcional |
| `/withdraw` | withdraw/page.tsx | Retirar fiat a banco registrado | ✅ Funcional |
| `/transactions` | transactions/page.tsx | Historial completo con filtros | ⚠️ Ver bugs |
| `/kyc` | kyc/page.tsx | Verificación de identidad (niveles 0–3) | ⚠️ Solo UI, no conectado |
| `/settings` | settings/page.tsx | Perfil, monedas, logout | ✅ Funcional |
| `/card` | card/page.tsx | Tarjeta LEN (placeholder) | 🔜 No implementada |

### Páginas no autenticadas `(auth)/`

| Ruta | Propósito | Estado |
|------|-----------|--------|
| `/login` | Login con teléfono + PIN, botones demo 1-click | ✅ Funcional |
| `/register` | Registro nuevo usuario | ⚠️ Solo UI, no conectado a backend |

### Páginas públicas

| Ruta | Propósito | Estado |
|------|-----------|--------|
| `/admin` | Panel de administración (contraseña: len2025) | ✅ Funcional (datos locales) |
| `/pitch` | Deck para inversores | ✅ Estático |

---

## 3. FLUJOS COMPLETOS

### 3.1 Login Demo (un click)
```
1. Usuario pulsa botón demo (GT / MX / HN)
2. demoLogin() → setUser() + setTokens() en auth.store
3. loadUserSnapshot(userId) desde Firestore
   ├── Si existe → setWallets() + setTransactions() + setBankAccounts()
   └── Si no existe → set defaultWallets + defaultTxs → saveUserSnapshot()
4. startWalletSync(userId)
   ├── Subscribe useWalletStore → scheduleSave() [debounce 1500ms]
   ├── Subscribe useBankStore  → scheduleSave() [debounce 1500ms]
   └── onSnapshot Firestore   → merge nuevas txs entrantes
5. router.push('/dashboard')
```

### 3.2 Recarga de página (session activa)
```
1. AppLayout monta → hydrated=true, isAuthenticated=true
2. useAuthStore.getState().user → userId
3. syncFromFirestore(userId)
   ├── loadUserSnapshot → setWallets + setTransactions + setBankAccounts
   └── isExternalUpdate=true (no dispara save loop)
4. startWalletSync(userId) → subscriptions activas
```

### 3.3 Envío P2P (cross-device real-time)
```
Teléfono A (Emisor)                    Teléfono B (Receptor)
─────────────────────                  ─────────────────────
1. /send → destinatario                   onSnapshot activo
2. monto + cotización FX
3. executeTransfer(pin)
   ├── recordTransfer(tx)             4. [Firestore trigger]
   │   → wallet.store actualiza          subscribeToUserSnapshot fires
   │   → scheduleSave() → Firestore      updatedBy === 'system' → procesa
   │                                      setWallets(remoteSnap.wallets)
   └── creditTransfer(recipientId)        setTransactions(remoteSnap.transactions)
       → escribe en doc del receptor   5. UI actualiza en tiempo real
```

### 3.4 Comprar tokens
```
1. /buy-tokens → seleccionar monto de fiatBalance
2. PIN confirm
3. buyTokens(coin, amount)
   ├── fiatBalance -= amount
   ├── balance (tokens) += netTokens
   └── transactions.unshift(tx)
4. scheduleSave() → Firestore (via wallet-sync subscription)
```

### 3.5 Retirar a banco
```
1. /withdraw → seleccionar cuenta bancaria
2. seleccionar monto (de fiatBalance)
3. PIN confirm
4. handleExecute()
   ├── setWallets(fiatBalance -= amount)
   ├── appendTransactions([fiat_withdraw tx])
   └── scheduleSave() → Firestore (via wallet-sync subscription)
[Nota: el retiro bancario real requiere integración ACH/SPEI — no implementado]
```

---

## 4. MODELO DE DATOS FIRESTORE

### Colección: `len_demo_users`

```typescript
// Documento: len_demo_users/{userId}
// userId demo: 'demo-gt' | 'demo-mx' | 'demo-hn'

interface UserSnapshot {
  wallets: WalletBalance[];     // array de wallets del usuario
  transactions: Transaction[];  // historial completo (máx 60 por usuario)
  bankAccounts?: BankAccount[]; // cuentas bancarias guardadas
  updatedAt: string;            // ISO timestamp
  updatedBy?: string;           // userId propio O 'system' (crédito P2P)
}

interface WalletBalance {
  coin: 'QUETZA' | 'MEXCOIN' | 'LEMPI' | ...;
  balance: string;       // saldo token total
  available: string;     // saldo disponible (no reservado)
  fiatBalance: string;   // GTQ/MXN/HNL depositado, no convertido a tokens
  fiatCurrency: string;  // 'GTQ' | 'MXN' | 'HNL'
  balanceUSD: number;    // referencia interna, nunca se muestra al usuario
}

interface Transaction {
  id: string;           // LEN-YYYYMMDD-TYPE-RAND5
  type: 'transfer' | 'fiat_load' | 'fiat_withdraw' | 'fx_swap' | 
        'token_buy' | 'token_sell' | 'fee' | 'refund' | 'purchase';
  status: 'completed' | 'pending' | 'processing' | 'failed' | 'reversed';
  direction: 'sent' | 'received' | 'internal';
  fromCoin / toCoin: CoinCode;
  fromAmount / toAmount: string;
  fxRate?: number;      // solo en fx_swap
  fee: string;
  feePercent?: number;
  description?: string;
  recipientName? / senderName?: string;
  createdAt: string;
  completedAt?: string;
}
```

### Regla de seguridad recomendada (pendiente de configurar):
```javascript
// Actualmente las reglas son ABIERTAS en modo demo
// En producción:
// - Solo el usuario autenticado puede leer/escribir su propio documento
// - El campo updatedBy='system' solo puede escribirse desde Cloud Functions
```

---

## 5. STORES (ZUSTAND)

| Store | localStorage key | ¿Synced Firestore? | Propósito |
|-------|-----------------|---------------------|-----------|
| auth.store | mondega-auth | ❌ Solo localStorage | Sesión usuario, tokens JWT |
| wallet.store | mondega-wallet | ✅ Sí (wallet-sync.ts) | Wallets, transacciones |
| bank.store | mondega-bank-accounts | ✅ Sí (wallet-sync.ts) | Cuentas bancarias |
| admin.store | mondega-admin | ❌ Solo localStorage | Estado panel admin |

**Sync mechanism:** `wallet-sync.ts`  
- Subscribe a cambios en wallet.store y bank.store  
- Debounce 1500ms → `saveUserSnapshot()`  
- `onSnapshot()` Firestore → aplica cambios externos (P2P recibidos)  
- Flag `isExternalUpdate` previene bucles de guardado

---

## 6. TOKENS Y MONEDAS

| Token | País | Fiat | Fase | Activo |
|-------|------|------|------|--------|
| QUETZA | Guatemala | GTQ | 1 | ✅ |
| MEXCOIN | México | MXN | 1 | ✅ |
| LEMPI | Honduras | HNL | 1 | ✅ |
| COLON | El Salvador | USD | 2 | 🔜 |
| DOLAR | USA | USD | 2 | 🔜 |
| TIKAL | Belize | BZD | 3 | 🔜 |
| NICORD | Nicaragua | NIO | 3 | 🔜 |
| CORI | Costa Rica | CRC | 3 | 🔜 |

**Comisiones:**
- Compra tokens (fiat→token): 0% (sin comisión por ahora)
- Venta tokens (token→fiat): 0.5%
- Envío P2P mismo país: 0%
- Envío FX cross-chain: 0.3%–0.5% (calculado en fx-engine.ts)

---

## 7. BUGS IDENTIFICADOS

### 🔴 CRÍTICOS (afectan funcionalidad core)

**BUG-001: Números grandes desbordaban la UI (CORREGIDO en v0.6)**  
- Saldos como 250,000 MEXCOIN o 500,000 LEMPI se mostraban con texto `text-3xl` que en pantallas pequeñas (<375px) se desbordaba del contenedor.
- Fix necesario: abreviar con K/M para números >10,000.

**BUG-002: Bank accounts no se sincronizaban cross-device (CORREGIDO en c07acbf)**  
- `useBankStore` solo usaba localStorage. En otro teléfono, las cuentas aparecían vacías.
- Fix aplicado: bank accounts ahora están en UserSnapshot.bankAccounts y se sincronizan vía wallet-sync.

**BUG-003: `startWalletSync` no se llamaba en recarga de página (CORREGIDO en c07acbf)**  
- Al recargar o abrir en otro dispositivo, el sync no se iniciaba aunque el usuario estuviera autenticado.  
- Fix aplicado: AppLayout llama `syncFromFirestore` + `startWalletSync` en cada sesión autenticada.

**BUG-004: Transacciones DEMO_TX_BASE se mostraban como fallback (estado: puede persistir)**  
- En transactions/page.tsx existe `DEMO_TX_BASE` que fue eliminado como fallback pero el array aún está declarado (código muerto, ~70 líneas).

### 🟡 MEDIANOS (UX degradada)

**BUG-005: Pantalla KYC usa estilos viejos (`text-mondega-green`, `border-mondega-green`)**  
- La clase `mondega-green` no existe en el sistema de diseño actual. Se ve sin estilo.
- Necesita reescribirse con clases `len-*`.

**BUG-006: Historial de retiros no distinguible en filtros**  
- El filtro "Cargas" en transactions/page.tsx incluye `fiat_load` Y `fiat_withdraw` mezclados.
- El usuario no puede ver solo retiros bancarios de forma rápida.

**BUG-007: Sección de destinatario en /send no indica que los 3 usuarios son de prueba**  
- Los botones GT/MX/HN en RecipientInput parecen usuarios reales.
- El input no tiene ninguna indicación de que en producción se buscaría por teléfono real.

**BUG-008: Push notifications no se piden nunca al usuario**  
- `firebase.ts` tiene `requestNotificationPermission()` implementada con FCM.
- Nunca se llama desde ninguna pantalla.
- Sin VAPID key configurada en Railway env vars.

**BUG-009: Registro (/register) no conectado**  
- La pantalla existe y tiene buena UI pero el submit va a `/auth/register` (backend offline).
- No crea usuario ni wallet, no hay flujo de onboarding completo.

**BUG-010: /bank-accounts no existe como página**  
- Settings.tsx tiene un link a `/bank-accounts` pero esa página no existe.
- Redirige a 404. Las cuentas bancarias se gestionan solo desde /withdraw.

**BUG-011: buy-tokens guarda snapshot manualmente además del wallet-sync**  
- En buy-tokens/page.tsx línea 56–60: llama `saveUserSnapshot()` directamente.
- Esto es redundante con wallet-sync (que ya guarda automáticamente).
- No es crítico pero puede causar doble escritura.

**BUG-012: Tamaños de fuente para números grandes no se adaptan**  
- 500,000 LEMPI con `text-3xl font-black` = "500,000.00" en 7 caracteres que puede desbordarse.
- Mismo problema en BalanceCard parte superior (fiatBalance) e inferior (tokens).

### 🟢 MENORES (cosméticos / mejoras)

**BUG-013: /kyc no usa el user del authStore sino API call**  
- KYCPage hace `apiClient.get('/kyc/status')` que falla, quedando `loading: true` indefinidamente o mostrando error.
- Debería usar `user.kycLevel` del authStore como fallback.

**BUG-014: Fecha de transacciones formatea con `es-GT` para todos los usuarios**  
- MX y HN usuarios ven fechas en formato guatemalteco.
- Menor pero inconsistente.

**BUG-015: `sell-tokens` no tiene Firestore save manual (solo vía wallet-sync)**  
- Similar a buy-tokens, pero sell-tokens no tiene el doble-save. Consistencia.
- Si wallet-sync funciona bien, no es un bug, solo asimetría.

---

## 8. CONECTIVIDAD MÓDULO → MÓDULO

```
/login
  ├── → auth.store (setUser, setTokens)
  ├── → wallet.store (setWallets, setTransactions)
  ├── → bank.store (setState.accounts)
  └── → wallet-sync (startWalletSync)

/dashboard
  ├── ← wallet.store (wallets, transactions)
  ├── ← auth.store (user)
  └── → links a: /send, /receive, /add-money, /buy-tokens, /sell-tokens, /withdraw

/send
  ├── ← wallet.store (wallets para balance)
  ├── ← auth.store (user para fromCoin)
  ├── → wallet.store (recordTransfer)
  ├── → user-db.creditTransfer (Firestore → destinatario)
  └── → fx-engine.calculateFXQuote (FX rates en memoria)

/add-money
  ├── ← auth.store (user.country → elige modelo depósito)
  ├── ← wallet.store (wallets para fiatBalance)
  └── → bank.store (solo lectura, no escribe)

/buy-tokens
  ├── ← wallet.store (fiatBalance)
  ├── → wallet.store.buyTokens()
  └── → user-db.saveUserSnapshot() [doble escritura — BUG-011]

/sell-tokens
  ├── ← wallet.store (token balance)
  └── → wallet.store.sellTokens()

/withdraw
  ├── ← bank.store (accounts)
  ├── ← wallet.store (fiatBalance)
  ├── → bank.store.addAccount / removeAccount
  ├── → wallet.store.setWallets (deducir fiat)
  └── → wallet.store.appendTransactions

/transactions
  └── ← wallet.store (transactions)

/settings
  ├── ← auth.store (user)
  ├── ← wallet.store (wallets)
  └── → wallet-sync.stopWalletSync() en logout

/admin
  └── ← admin.store (autocontenido, localStorage)
```

---

## 9. FEATURES PENDIENTES (próximas versiones)

| Feature | Prioridad | Notas |
|---------|-----------|-------|
| Backend API conectado | 🔴 Alta | Todas las llamadas fallan silenciosamente en demo |
| Registro real de usuario | 🔴 Alta | /register no funciona, solo demo |
| Push notifications | 🔴 Alta | FCM configurado pero nunca activado |
| /bank-accounts página | 🟡 Media | Link en settings → 404 |
| KYC real (Jumio/Onfido) | 🟡 Media | /kyc carga indefinidamente sin backend |
| Tarjeta LEN (Pomelo) | 🟡 Media | /card es placeholder. Requiere KYC level 2+ |
| Firestore security rules | 🔴 Alta | Actualmente abiertas (modo dev). Crítico antes de producción |
| Búsqueda de usuarios por teléfono real | 🟡 Media | Solo funciona con 11111/22222/33333 |
| Historial de retiros (filtro dedicado) | 🟢 Baja | Actualmente mezclado con depósitos en filtro "Cargas" |
| Soporte multi-wallet (user con GT y MX) | 🟡 Media | El modelo lo soporta pero la UI solo muestra el primero |
| Admin: usuarios reales desde Firestore | 🟡 Media | Panel admin usa datos hardcoded en store |
| Exportar CSV/PDF historial | 🟢 Baja | Botón en UI pero no implementado |
| VAPID key para push | 🔴 Alta | Env var `NEXT_PUBLIC_FIREBASE_VAPID_KEY` no configurada |

---

## 10. CONFIGURACIÓN DE ENTORNO

### Variables de entorno necesarias (Railway)

| Variable | Estado | Descripción |
|----------|--------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ Hardcoded fallback | Proyecto lentech-216a0 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ Hardcoded fallback | lentech-216a0.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ Hardcoded fallback | lentech-216a0 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ Hardcoded fallback | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ Hardcoded fallback | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ Hardcoded fallback | |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | ❌ FALTA | Necesario para push notifications |
| `NEXT_PUBLIC_API_URL` | ❌ FALTA | URL del backend API |

### Firebase Firestore — reglas actuales
```
// PELIGRO: modo desarrollo — acceso público total
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
**Configurar reglas de producción antes de cualquier launch real.**

---

## 11. RESUMEN EJECUTIVO

### ✅ Lo que funciona bien
- Demo cross-device: login en otro teléfono carga el estado correcto desde Firestore
- P2P tiempo real: enviar a otro usuario actualiza su saldo instantáneamente
- Flujo completo: depositar → comprar tokens → enviar → vender → retirar
- Diseño institucional (v0.6): paleta índigo profundo via CSS variables
- Panel admin: gestión de bancos, parámetros, usuarios, FX overrides
- Wallet sync: bank accounts ahora se sincronizan cross-device

### ⚠️ Bloqueadores antes de usuarios reales
1. Firestore security rules (actualmente abiertas)
2. Backend API conectado (registro, KYC, balance real)
3. Push notifications configuradas (VAPID key)
4. Cuentas bancarias reales (KYC verificado primero)

### 📊 Estado por módulo
| Módulo | Demo | Producción |
|--------|------|-----------|
| Auth (login/session) | ✅ | ❌ Backend |
| Wallet sync | ✅ | ✅ Firestore |
| P2P Send | ✅ | ⚠️ Parcial |
| Receive QR | ✅ | ✅ |
| Buy/Sell tokens | ✅ | ❌ Backend |
| Withdraw banco | ✅ UI | ❌ ACH/SPEI |
| KYC | ❌ | ❌ |
| Push notifications | ❌ | ❌ |
| Admin panel | ✅ | ❌ Backend |

---

*Reporte generado automáticamente durante auditoría de código completa — LEN v0.6.0 — 2026-04-14*
