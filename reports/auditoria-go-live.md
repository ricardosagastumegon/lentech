# LEN / MONDEGA — Auditoría de Go-Live
**Fecha:** 2026-06-03 · **Branch:** `main` · **Commit:** `49033d6`
**Método:** 5 subagentes en paralelo (estructura, seguridad, financiero, cumplimiento, producción), lectura del código real con cita de archivo:línea.

---

## Resumen ejecutivo

**Veredicto: NO listo para go-live con dinero real. Apto para demo / piloto cerrado controlado.**

LEN tiene una **base técnica sólida en piezas concretas** — el ledger off-chain (atómico, idempotente, sin doble gasto), el manejo de secretos (limpio), las `firestore.rules` cerradas, y la verificación HMAC de Pomelo/Conduit. Pero **la integridad del dinero y el cumplimiento AML/KYC no están listos para producción**, y hay cero pruebas, observabilidad ni backups.

### El problema estructural de fondo
Existen **dos sistemas de dinero que NO están conectados ni reconciliados**:
- **Ledger off-chain** en Firestore (`/api/wallet/*`) — bien construido.
- **Flujo on-chain** en Celo (`/api/transfers/*`, `/api/admin/mint`, webhooks).

Un depósito por una ruta acredita el ledger **sin** mintear on-chain; por otra ruta mintea on-chain **sin** tocar el ledger. **Nunca se igualan, y nada los reconcilia.** Para un emisor de tokens respaldados 1:1, este es el riesgo #1.

### Top bloqueantes 🔴 (detalle y citas en las secciones)
1. **Dos sistemas de dinero desconectados** (ledger Firestore vs Celo on-chain), sin sincronía. (§3.1)
2. **Cero reconciliación** reservas↔supply↔ledger; el 1:1 es solo conceptual, sin proof-of-reserves. (§3.3)
3. **Retiro quema antes de pagar, sin SPEI implementado ni rollback** → pérdida garantizada de fondos del usuario ante fallo. (§3.5, §5.5)
4. **Depósitos minteados sin verificación contra el ingreso bancario real** (webhook/admin/usuario). (§3.5)
5. **Límites KYC son cosméticos** — no se aplican en `wallet/transfer|deposit|withdraw`; un usuario L0 anónimo opera sin tope. (§4.1)
6. **Sin verificación real de identidad** (solo guarda fotos; no liveness, OCR ni sanciones/PEP/OFAC). (§4.1)
7. **Sin detección ≥US$10K ni structuring ni reporte UIF/IVE** — contradice el pitch ("monitoreo AML en tiempo real"). (§4.3)
8. **Sin retención 5-10 años ni backups de Firestore**; auditoría vía `console.log` efímero. (§4.4, §5.4)
9. **Tasas FX hardcodeadas/estáticas**, sin feed real ni spread de riesgo cambiario. (§3.4)
10. **`transfers/send|withdraw` confían en la wallet del body, no la atan al token** (burn/transfer no autorizado si se activa flujo custodial). (§2.4)
11. **Webhook Cuenca sin anti-replay + usa SDK cliente** (fallará con las rules cerradas). (§2.5)
12. **Cero tests** en todo el repo; CI solo hace typecheck/build. (§5.1)

### Lo que SÍ está bien 🟢
- **Ledger off-chain:** doble entrada, transacción atómica Firestore, idempotente, validación de saldo dentro de la transacción → **sin race condition ni doble gasto**. (§3.2)
- **Secretos:** `.gitignore` correcto; `firebase-service-account.json` y `.env` **nunca commiteados** (verificado: no en historial, sí ignorado, solo local). (§2.1)
- **`firestore.rules`:** cerradas (`if false`), acceso por Admin SDK. (§2.2)
- **Auth del ledger:** `wallet/*` deriva `userId` del JWT, FX recalculado server-side. (§2.4, §3.4)
- **HMAC Pomelo/Conduit:** timing-safe real + anti-replay + idempotencia. (§2.5)

### Nota de despliegue (operacional, fuera del repo)
Los subagentes auditaron el repo. Operacionalmente, hoy el despliegue está **fragmentado**: `apps/web` corre en **Vercel** (configurado por dashboard, sin `vercel.json` en el repo), mientras **Railway** tiene 3 servicios (`web`, `admin`, `lentech` — dos sirviendo admin). Consolidar a una sola plataforma es parte del trabajo de go-live.

---

## Madurez por área
```
Demo / pitch:        ████████████████████ 100%
Sandbox / piloto:    ███████████████░░░░░  ~75%
Dinero real (prod):  ████████░░░░░░░░░░░░  ~40%
```

---

## 1. Estructura y Stack

### 1.1 Mapa de carpetas (estado real)
| Carpeta | Estado | Detalle |
|---|---|---|
| `apps/web` | **ACTIVA / LIVE** | Monolito real: frontend + **todos los API routes** + lógica (`src/lib/`). Next.js 14.2.35, TS strict |
| `apps/admin` | **ACTIVA** | Panel operador (`/mint`, `/access`, `/commission`). Next.js, deploy Railway |
| `apps/mobile` | **SCAFFOLD MUERTO** | RN, sin `package.json`, no compila |
| `packages/shared-types`, `shared-utils` | Vivo (lo consumen services) | TS |
| `packages/sdk`, `ui-components` | **MUERTOS** | Carpetas vacías |
| `services/*` (8) | **SCAFFOLD — NADA DESPLEGADO** | NestJS 10. `tx-engine` vacío; `compliance`/`wallet`/`fx`/`notification` sin `main.ts` |
| `blockchain` | **ACTIVO** | Solidity 0.8.24 + Hardhat; contratos en Celo mainnet + Sepolia |
| `infrastructure` | **SCAFFOLD ROTO** | `docker-compose` local; `k8s/` y `terraform/` con nombres de directorio rotos por brace-expansion fallida |

### 1.2 Backend NestJS = scaffold no funcional
Toda la lógica de producción vive en los **API routes de `apps/web`**. El CD por Docker está deshabilitado a propósito (`.github/workflows/cd-staging.yml:1-29`). `apps/web/src/lib/firebase-admin.ts` ≠ `packages/shared-utils/src/firebase-admin.ts` → web no consume los packages del backend.

### 1.3 Versiones clave
Next.js `14.2.35` (`apps/web/package.json:20`) · firebase `^10.12.0` / firebase-admin `^13.0.0` (`:16-17`) · viem `^2.48.0` (`:23`) · Solidity `0.8.24` (`blockchain/hardhat.config.ts:11-15`) · OpenZeppelin `^5.0.0` · NestJS `^10.4.15` · Turborepo `^2.0.0` · pnpm `9.0.0` · Node `>=20`.
⚠️ Inconsistencia: el root `package.json:6-10` declara `workspaces` (npm) redundante con `pnpm-workspace.yaml`.

### 1.4 Plataformas
- **Railway (Nixpacks):** `apps/web` y `apps/admin` (`railway.json:3-4`, `apps/web/nixpacks.toml`, `apps/admin/nixpacks.toml`). ⚠️ el `nixpacks.toml` raíz apunta a **admin**, no a web.
- **Firebase (Firestore):** datastore real. Colecciones `len_*`: `len_users`, `len_demo_users` (¡dos colecciones de usuarios!), `len_balances`, `len_ledger_entries`, `len_treasury`, `len_commission_config`, `len_transactions`, `len_processed_webhooks`, `len_kyc_documents`, `len_kyc_submissions`, `len_admin_mints`.
- **Celo Mainnet (42220):** contratos desplegados `2026-05-11` (`blockchain/deployments/addresses.celo-mainnet.json`): MEXCOIN/QUETZA/LEMPI. Mint/burn cableado server-side en `apps/web/src/lib/celo-admin.ts` (treasury key), importado por 10 API routes.

### 1.5 Secretos en git — VERIFICADO ✅
`firebase-service-account.json` está **gitignored, NUNCA commiteado y solo en disco local** (verificado: `git ls-files`=no lo trackea, `git check-ignore`=lo ignora, `git log --all`=vacío). `firebase-admin.ts:57` lo carga como **fallback de desarrollo** (no en producción). **No hay exposición.** *(Corrige un error del subagente de estructura que lo reportó como commiteado.)*

### 1.6 Diagrama de flujo de datos
```
Bancos/Procesadores        Cliente Web (Next.js)        apps/mobile (scaffold, no deploy)
(Pomelo/Conduit/Cuenca)         apps/web
        │ webhooks HMAC            │ fetch
        └──────────────┬──────────┘
                       ▼
   ┌──────────────────────────────────────────────┐
   │  Next.js API routes (apps/web/src/app/api/**)  │  ← ÚNICO backend real
   │  /webhooks/* /wallet/* /transfers/* /auth/*    │
   │  /admin/* /kyc                                  │
   └───────┬────────────────────────────┬──────────┘
           │ Admin SDK                   │ viem (treasury key)
           ▼                             ▼
   Firebase Firestore             Celo Mainnet (42220)
   (ledger/usuarios)              MondegaCoin ERC-20 (decimals=2)

   [services/* NestJS] → scaffold, sin deploy   [Railway+Nixpacks] → hospeda web+admin
```

---

## 2. Seguridad

### 2.1 Secretos en git — 🟢
`.gitignore:5-22` cubre `.env*`, `firebase-service-account*.json`, `*.pem`, `*.key`. `git log --all` para service-account y `.env` → **vacío** (nunca commiteado). Solo hay `*.env.example` con placeholders. **Sin secretos filtrados.**

### 2.2 firestore.rules — 🟢
Cerrado: `len_users`/`len_transactions`/`len_processed_webhooks` → `if false` (`firestore.rules:21,25,29`); catch-all `if false` (`:42`). Acceso por Admin SDK.
🟡 El webhook **Cuenca** usa el **SDK cliente** (`cuenca/deposit/route.ts:19-20,60`) → con rules cerradas **fallará en producción** (bug funcional).

### 2.3 Secretos hardcodeados — 🟢
- Firebase web config con fallback (`lib/firebase.ts:8-13`) = **público por diseño**, no es hallazgo.
- Secretos de integraciones → fallback a `""`, nunca a valor real (`pomelo-client.ts:22`, `conduit-client.ts:25-27`).
- `LEN_JWT_SECRET` lanza error si falta/<32 (`auth.ts:19-24`); `LEN_ADMIN_API_KEY` igual (`admin-auth.ts:21-25`).

### 2.4 Auth/Authz por endpoint
JWT deriva `userId` del `sub` verificado (`auth.ts:64-71`); admin con `timingSafeEqual` (`admin-auth.ts:20-40`). Los endpoints del **ledger** (`wallet/transfer|deposit|withdraw|balance|transactions`, `kyc`, `admin/*`) **atan el userId al token** y validan inputs → 🟢.

🔴 **`transfers/send` y `transfers/withdraw` confían en la wallet del body, no la atan al usuario del token.** `transfers/send/route.ts:92` toma `from_address` del body; `transfers/withdraw/route.ts:50,89,107` toma `wallet_address` del body y **quema MEXCOIN** sobre ella. El `userId` del token solo se usa para el log, no autoriza. Si se activa el flujo custodial/allowance, un usuario podría mover/quemar fondos de otra wallet. **Fix:** derivar la dirección de `getUserById(userId).celo_address`, ignorar el body.

🟡 PIN de 6 dígitos sin complejidad (`auth/register/route.ts:50`); mitigado por lockout. Rate-limit por IP delegado a infra (`auth/token/route.ts:14`).

### 2.5 HMAC de webhooks
| Proveedor | Timing-safe | Anti-replay | Idempotencia | Veredicto |
|---|---|---|---|---|
| **Pomelo** | ✅ (`pomelo-client.ts:128-134`) | ✅ ±5 min (`:109-113`) | ✅ (`pomelo/deposit/route.ts:50-53`) | 🟢 |
| **Conduit** | ✅ (`conduit-client.ts:152-159`) | ✅ ±5 min (`:137-143`) | ✅ (`conduit/deposit/route.ts:64-68`) | 🟢 |
| **Cuenca** | 🟡 compare casero (`cuenca-client.ts:66-73`) | 🔴 **sin anti-replay** (`:48-64`) | ✅ | 🔴 |

🔴 **Cuenca sin anti-replay** (no firma timestamp) + usa SDK cliente (2.2) → necesita refactor.
🟡 **TOCTOU en idempotencia de TODOS los webhooks:** patrón `get()`→mint→`set()` no transaccional (`pomelo/deposit/route.ts:50-53,77-80`). Dos entregas concurrentes del mismo evento podrían causar **doble mint**. **Fix:** `create()` o transacción que reserve el doc antes del mint.

---

## 3. Financiero / Integridad del dinero

> **Hallazgo de fondo:** dos sistemas de dinero (ledger Firestore vs Celo on-chain) **desconectados y no reconciliados**.

### 3.1 Respaldo 1:1
🔴 **Puramente conceptual; nada lo verifica** (`ledger.ts:13` lo declara como aspiración). Cero lecturas de `totalSupply()` (grep=0). **Un depósito por `/api/wallet/deposit` acredita el ledger SIN mintear; por webhook mintea SIN tocar el ledger** (`webhooks/pomelo/deposit/route.ts:70` vs `wallet/deposit/route.ts`).
🔴 **Dos motores de comisión** independientes: `fx-engine.getFee` (0.3-0.8%, `fx-engine.ts:29-36`) vs `commission-config` (1.5% fijo). Sin fuente única.

### 3.2 Ledger — 🟢 (la parte mejor construida)
- **Atómico:** todo en una `db.runTransaction` (`ledger.ts:81-119`).
- **Idempotente:** por `entry_id`; `ref` con `randomUUID()` (`transfer/route.ts:52`).
- **Validación de saldo DENTRO de la transacción — sin TOCTOU** (`ledger.ts:96-106`). **Sin doble gasto en el ledger off-chain.**
- 🟡 "Doble entrada" parcial: `transfer` cuadra, pero `deposit` solo créditos y `withdraw` solo débito+fee — **no hay cuenta de reservas/emisión** contra la cual cuadrar.
- 🔴 **El flujo on-chain SÍ tiene race condition:** `transfers/send/route.ts:120-163` y `withdraw:89-119` leen balance y luego ejecutan sin lock → doble gasto posible (lo frena el contrato, pero deja `len_transactions` inconsistente).

### 3.3 Reconciliación — 🔴 NO EXISTE
Grep `reconcil`/`cron`/`totalSupply` = 0. No hay job que cuadre reservas banco vs supply on-chain vs ledger, ni proof-of-reserves, ni alerta de descalce. Para un emisor 1:1, el hueco más grave.

### 3.4 FX (GTQ↔MXN)
🔴 **Tasas hardcodeadas/estáticas** (`fx-engine.ts:17-26`); el "fx-engine service" del comentario no existe.
🟢 FX recalculado **server-side** (`transfer/route.ts:44-47`), no confía en el cliente.
🔴 **Ventana de validez NO se aplica** (`validUntil` solo cosmético, `fx-engine.ts:99` → `FXQuoteCard.tsx:17`); el `quoteId` del cliente se ignora.
🟡 Sin spread bid/ask (usa `midRate` puro); el riesgo cambiario lo come LEN. Residuo de redondeo a 2 decimales sin cuenta contable → fuga acumulativa.

### 3.5 Depósito / Retiro
🔴 **Depósito mintea sin respaldo verificado:** `admin/mint/route.ts:76` el admin teclea monto a mano; webhooks confían en el monto del evento sin conciliar contra el banco. (`wallet/deposit` está gateado a demo — confirmar que NO esté activo en prod.)
🔴 **Retiro quema primero, paga después, SIN rollback:** `transfers/withdraw/route.ts:107` quema MEXCOIN → `// TODO: encolar SPEI` (`:142`). El pago fiat **no está implementado**; el código admite "Si SPEI falla → intervención manual (MEXCOIN ya quemado)". **Pérdida directa de fondos.**
🟡 Comisión de retiro inconsistente: `transfers/withdraw` usa `0.003` hardcoded; `wallet/withdraw` usa `commission-config` (1.5%).

---

## 4. Cumplimiento (AML/KYC)

**Veredicto: 🔴 NO apto para go-live.** Hay andamiaje (niveles, captura de docs, cola de revisión) pero el cumplimiento efectivo es **nulo**.

### 4.1 KYC / KYB
🔴 **Los límites KYC son COSMÉTICOS — no se aplican en ninguna operación.** `withinSingleTxLimit()` (`identity.ts:126-129`) **no se llama en ningún endpoint** (grep=0 fuera de identity/UI). `wallet/transfer|withdraw|deposit` y el webhook Conduit **no consultan KYC ni límite** (`wallet/transfer/route.ts:41-78`, etc.). **Un usuario anónimo L0 transfiere/retira montos arbitrarios.** Único tope real: $50K MXN fijo (no ligado a KYC) en `transfers/send/route.ts:66-69`; su `daily_mxn:200_000` se define pero **nunca se evalúa**.
🟡 **Sin verificación real de identidad:** `submitKyc` solo guarda fotos como dataURL en Firestore (`identity.ts:57-99`); aprobación 100% manual. **No hay liveness/face-match, OCR, ni screening sanciones/PEP/OFAC** (grep=0 funcional).
🔴 **KYB inexistente:** nivel 3 definido pero inalcanzable (`submitKyc` fija `level 2`, `identity.ts:88,121`).
🟡 **KYC opcional:** el registro no bloquea si faltan documentos (`auth/register/route.ts:62-76`).

### 4.2 Registro de transacciones — 🟢/🟡
Ledger doble entrada auditable (`len_ledger_entries`). 🟡 Inmutabilidad **por convención, no forzada** (Admin SDK bypasa rules; sin WORM/hash chain). 🟡 Dos pistas divergentes: ledger vs `len_transactions` (los `transfers/*` no tocan el ledger).

### 4.3 Detección ≥US$10K / structuring — 🔴 AUSENTE
Grep `10000|threshold|suspicious|structuring|report` = solo copy del pitch (`pitch/page.tsx:565`). Sin agregación diaria/mensual, sin reporte UIF/IVE, sin detección de fraccionamiento, sin monitoreo en tiempo real. **El pitch afirma "monitoreo AML en tiempo real" — falso respecto al código.**

### 4.4 Retención / backups — 🔴 AUSENTE
Sin política de retención (grep `retention|backup` = solo marketing). Sin export programado de Firestore ni PITR. Auditoría vía `console.log` efímero (Railway). Docs KYC sensibles sin ciclo de vida ni minimización.

---

## 5. Listo para producción

### 5.1 Tests — CERO
No existe un solo `*.test.ts`/`*.spec.ts` en código fuente (todos en `node_modules`). `apps/web` y `apps/admin` no tienen script `test`. Los 8 services tienen `jest.config.ts` sin specs. **Cero tests de smart contracts.** CI (`.github/workflows/ci.yml`) solo hace typecheck+build (no test, no lint, no security audit); CD deshabilitado (`cd-staging.yml:12`).

### 5.2 Manejo de errores
🟢 Rutas de ledger nuevas: try/catch + JSON tipado (`wallet/transfer/route.ts:77-88`).
🔴 **Caminos on-chain escriben a Firestore sin try/catch** tras la tx irreversible (`transfers/send/route.ts:172-186`, `withdraw:125-140`) → 500 HTML + **dinero movido sin registro** (descalce).
🟡 Filtran detalle de viem/RPC al cliente (`transfers/send:167`, `withdraw:116`).

### 5.3 Observabilidad — inexistente
Solo `console.*` (42 ocurrencias, 18 archivos); sin pino/Sentry/OpenTelemetry (grep=0). Sin monitoreo ni alertas. PII en logs (user_id, montos, comercio) en texto plano (`transfers/send:188`, `cuenca/card-payment:161`).

### 5.4 Backups — no configurados
`firebase.json` solo declara rules+indexes. Sin export programado ni PITR. Firestore es la fuente de verdad → corrupción/borrado **irrecuperable**.

### 5.5 Rollback — parcial y peligroso
App: Railway permite redeploy pero sin runbook/tags. **Datos/dinero:** `transfers/withdraw` quema sin SPEI ni rollback (`:142-143`); `transfers/send` puede dejar on-chain ≠ ledger. Sin migraciones de esquema.

### 5.6 Build/deploy
🔴 CI buildea web+admin, pero `nixpacks.toml:8,11` solo despliega **admin** (`pnpm --filter admin`) → confirmar que `apps/web` tiene su propio servicio. Infra duplicada/rota (`infrastructure/k8s`, `terraform` con nombres `{base,overlays` por brace-expansion fallida). `restartPolicyMaxRetries:3` sin alerta → crash-loop silencioso.

---

## Anexo — Matriz consolidada de bloqueantes para go-live

### 🔴 CRÍTICO (no salir con dinero real sin esto)
| # | Bloqueante | Sección |
|---|---|---|
| C1 | Reconciliación reservas↔supply↔ledger + proof-of-reserves; unificar los dos sistemas de dinero | §3.1, §3.3 |
| C2 | Retiro: cola SPEI con reintentos + rollback/re-mint si el fiat no sale (hoy quema sin pagar) | §3.5, §5.5 |
| C3 | Depósito minteado solo contra ingreso bancario verificado (no monto tecleado/confiado) | §3.5 |
| C4 | Aplicar límites KYC en `wallet/transfer|deposit|withdraw` + webhooks; bloquear L0 | §4.1 |
| C5 | Verificación real de identidad (proveedor: liveness, OCR) + screening sanciones/PEP/OFAC | §4.1 |
| C6 | Detección ≥US$10K + agregación diaria + reporte UIF/IVE + structuring | §4.3 |
| C7 | Backups de Firestore (PITR + export) + retención 5-10 años | §4.4, §5.4 |
| C8 | Feed de tasas FX real (no hardcodeado) + spread de riesgo + cotización vinculante | §3.4 |
| C9 | Atar wallets de `transfers/send|withdraw` al token (no al body) | §2.4 |
| C10 | Cuenca: anti-replay + Admin SDK + compare timing-safe | §2.2, §2.5 |
| C11 | Idempotencia de webhooks atómica (evitar doble mint concurrente) | §2.5 |
| C12 | Smoke/integration tests de los caminos de dinero (hoy cero) | §5.1 |
| C13 | try/catch en escrituras Firestore post-on-chain + cola de reconciliación | §5.2 |

### 🟡 ALTO
| # | Bloqueante | Sección |
|---|---|---|
| A1 | Logging estructurado (pino/Sentry) con redacción de PII + request-id | §5.3 |
| A2 | Unificar comisión (un solo motor) y resolver `transfers/*` vs `wallet/*` (cuál es autoritativo) | §3.1, §4.2 |
| A3 | Aplicar límite diario UIF (`daily_mxn` definido y no usado) | §4.3, §5.2 |
| A4 | No filtrar errores crudos de RPC al cliente | §5.2 |
| A5 | CI con test + lint + security audit; monitoreo/alertas (gas treasury, crash-loop, descalce) | §5.1, §5.6 |
| A6 | KYC obligatorio (bloquear registro/operación sin documentos) | §4.1 |
| A7 | Inmutabilidad forzada del ledger (append-only / hash chain) | §4.2 |
| A8 | Plan de rollback documentado + runbook de incidentes | §5.5 |

### 🟢 MEDIO
| # | Bloqueante | Sección |
|---|---|---|
| M1 | Consolidar despliegue (Vercel vs Railway; servicios duplicados) | §1, Nota |
| M2 | Eliminar scaffold muerto (`services/*`, `mobile`, `packages/sdk|ui`, `infra/k8s|terraform` rotos) | §1.1, §5.6 |
| M3 | KYB (empresas/UBO); nivel 3 alcanzable | §4.1 |
| M4 | Contabilizar residuo de redondeo FX | §3.4 |
| M5 | Unificar `len_users` vs `len_demo_users`; strings de error de saldo | §1.4, §3.2 |
| M6 | Migrar KYC docs a object storage (Firebase Storage) | §4.1, §4.4 |

---
*Auditoría generada con 5 subagentes en paralelo · 2026-06-03 · uso interno.*
