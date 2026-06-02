# LEN — Arquitectura de Producción (diseño)
**Fecha:** 2026-06-02
**Estado:** Propuesta de diseño — a aprobar antes de migrar. No romper el demo actual hasta ejecutar la migración por fases.

---

## 0. EL PROBLEMA QUE RESOLVEMOS
Hoy coexisten **dos arquitecturas mezcladas**:

- **Demo (desplegada):** la lógica de negocio (saldos, comprar/vender, "una sola moneda") vive en el **cliente** (zustand + localStorage + Firestore `len_demo_users`). El login está **dentro de la página**. El cliente es la fuente de verdad. → Correcto para demo, **inseguro para dinero real**.
- **Real (en PR #1, sin desplegar):** API routes (`/api/auth`, webhooks), `users-db`, `firebase-admin`, JWT. → Dirección correcta, a medio construir.
- **Scaffold muerto:** microservicios NestJS (`services/*`) vacíos.

**Meta:** una sola arquitectura, con el cliente "tonto" y el backend autoritativo.

---

## 1. PRINCIPIOS RECTORES
1. **Cliente tonto, backend autoritativo.** El cliente solo muestra estado y captura input. NUNCA decide saldos, mint/burn, KYC ni límites.
2. **Una sola fuente de verdad:** el **ledger** server-side. El saldo del usuario = suma de asientos del ledger, nunca un número editable en el cliente.
3. **Invariante 1:1 sagrado:** supply on-chain = reservas en banco = ledger. Toda ruta que pueda descalzarlo es bug crítico.
4. **Seguridad por diseño:** secretos solo en el servidor; idempotencia atómica; todo movimiento de dinero auditable.
5. **Simplicidad apropiada a la etapa:** sin sobre-ingeniería. Modular, no distribuido (todavía).

---

## 2. DECISIÓN CLAVE: monolito modular, NO microservicios

| Opción | Veredicto |
|---|---|
| **Microservicios NestJS** (`services/auth`, `card`, `wallet`…) | ❌ **Retirar por ahora.** 8 servicios = 8 deploys, 8 DBs, comunicación entre servicios, observabilidad… Sobre-ingeniería para tu etapa (pre-lanzamiento, equipo pequeño). |
| **Monolito modular en Next.js API routes (BFF)** | ✅ **Recomendado.** Un solo deploy (Vercel), módulos con fronteras claras dentro del mismo proceso. Ya existe la base en el PR #1. Migras a servicios el día que la escala/equipo lo justifique. |

> Regla: **microservicios se ganan, no se eligen.** Empieza monolito modular; extrae un servicio solo cuando un dominio tenga necesidades de escala o equipo propias.

---

## 3. CAPAS

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTE  — Next.js (app/) + React Query                    │
│  Solo UI. Lee estado del backend. Cero lógica de dinero.    │
└───────────────────────────────┬─────────────────────────────┘
                                 │  HTTPS + JWT
┌───────────────────────────────▼─────────────────────────────┐
│  BACKEND AUTORITATIVO  — Next.js API routes (modular)        │
│                                                              │
│  auth · identity/KYC · ledger · onchain · fx · commission · │
│  payments(bank) · compliance/AML                             │
└───────────────────────────────┬─────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
   Firestore (Admin)        Celo (mint/burn)        Bancos / BaaS
   ledger + usuarios        liquidación/auditoría   Pomelo·Conekta·Banrural
   (fuente de verdad)       (espejo del ledger)     (reservas reales)
```

---

## 4. MÓDULOS DEL BACKEND (fronteras y responsabilidad)

| Módulo | Responsabilidad | Qué NO hace |
|---|---|---|
| **auth** | Registro, login (phone+PIN), emisión/verificación JWT, refresh, sesión. **Login es su propio módulo.** | No conoce saldos ni KYC docs. |
| **identity / KYC** | Niveles KYC, captura/almacenamiento de DPI+selfie+recibo, integración con proveedor (Pomelo identity / Jumio), gating de límites por nivel. | No autentica. |
| **ledger** | **Fuente de verdad de saldos.** Doble entrada, asientos inmutables, saldo derivado. Idempotencia. | No habla con Celo ni bancos directo. |
| **onchain (celo)** | mint/burn/transfer en Celo, reconciliación contra el ledger, manejo de gas. | No decide montos (los recibe del ledger). |
| **fx** | Cotizaciones MXN↔GTQ↔HNL sin USD, spread, ventana de validez. | No mueve dinero. |
| **commission** | Config (admin) + cálculo y aplicación de comisión por operación/país. | No mintea. |
| **payments / bank** | Pomelo/Conekta/Banrural: webhooks (depósito→mint, retiro→burn→fiat), CLABE/sub-cuenta, settlement. | No decide KYC. |
| **compliance / AML** | Límites UIF/CNBV/CNBS, monitoreo, structuring, reportes. | No procesa pagos. |

Cada módulo = una carpeta `lib/<modulo>/` + sus rutas `app/api/<modulo>/`. Dependencias en una dirección: rutas → módulos → infraestructura. Nada de lógica en componentes de UI.

---

## 5. FUENTE DE VERDAD Y EL 1:1

```
Depósito:  banco confirma fiat  →  ledger CREDITA (asiento)  →  onchain MINT (espejo)
Retiro:    ledger DEBITA          →  onchain BURN              →  banco envía fiat
Saldo del usuario = SUMA de asientos del ledger (no un campo editable)
Reconciliación (job):  reservas banco  ==  ledger  ==  supply on-chain
```
- El cliente **lee** el saldo del ledger vía API. No lo calcula ni lo guarda como verdad.
- Celo es el **espejo auditable** del ledger, no la fuente primaria de UX.
- La comisión se registra como **asiento aparte** (treasury), para que el 1:1 cuadre.

---

## 6. AUTH COMO MÓDULO (respuesta directa a tu pregunta)
**Sí, login es un módulo separado.** Concretamente:

```
lib/auth/            → signToken, verifyToken, verifyAuth(req), password (scrypt)
lib/identity/        → KYC levels, doc storage, provider
app/api/auth/
  ├── register/      → crea usuario + arranca KYC (DPI, selfie, recibo, PIN)
  ├── token/         → login phone+PIN → JWT   (ya existe)
  └── refresh/       → rota el token
middleware           → protege rutas que requieren sesión / nivel KYC
```
- La **página de login/registro** queda **delgada**: solo formularios que llaman a `/api/auth/*`.
- Se elimina el bloque de usuarios demo hardcodeados de la página (se mueve detrás de un flag `DEMO_MODE`).

---

## 7. EL CLIENTE (qué cambia)
- Reemplazar "zustand-como-fuente-de-verdad" por **React Query** que lee del backend (`/api/wallet/balance`, `/api/transactions`, `/api/kyc/status`).
- zustand queda solo para **UI state** (paso del wizard, toggles), no para dinero.
- localStorage deja de ser caché de saldos.

---

## 8. PLAN DE MIGRACIÓN POR FASES (sin romper el demo)

| Fase | Qué | Riesgo demo |
|---|---|---|
| **0 — hoy** | Mantener demo client-side para Banrural. | — |
| **1 — Backend de lectura** | Endpoints autoritativos de saldo/tx/kyc; cliente lee de ahí (React Query). Demo detrás de `DEMO_MODE`. | Bajo |
| **2 — Auth real** | `/api/auth/register` + KYC (DPI/selfie/recibo/PIN) server-side; página delgada; quitar demos hardcodeados. | Medio |
| **3 — Dinero server-side** | Ledger como verdad; depósito→mint con comisión; retiro→burn→fiat con rollback; reconciliación. | Medio |
| **4 — Hardening** | Rate-limit, secrets manager, idempotencia atómica, logs estructurados, alertas. | Bajo |
| **(futuro)** | Extraer a servicios solo si escala/equipo lo exige. | — |

---

## 9. QUÉ SE RETIRA / LIMPIA
- ❌ Microservicios NestJS scaffolded (`services/*`) — archivar; no son el camino ahora.
- ❌ Lógica de negocio en páginas (login con demos, saldos en el store) → detrás de `DEMO_MODE` o eliminada.
- ❌ `buy-tokens`/`sell-tokens` (ya huérfanas con el modelo de una sola moneda).
- ✅ Conservar y consolidar: API routes del PR #1 como base del backend modular.

---

## 10. DECISIONES QUE NECESITO DE TI
1. **Backend:** ¿confirmas monolito modular en Next.js (recomendado) y archivamos los microservicios NestJS?
2. **Auth/KYC:** ¿proveedor de verificación de identidad para producción? (Pomelo identity para MX; para GT/HN definir — Banrural podría dar el KYC, o Jumio/Onfido.)
3. **Custodia:** ¿el ledger vive en Firestore (rápido) o migras a Postgres (más natural para doble entrada) en la Fase 3?
4. **Orden:** ¿migramos Fase 1→4 después de Banrural, o quieres priorizar alguna parte antes?

---

*Diseño preparado con los lentes product-architect + backend-systems-engineer. Complementa el runbook `LEN_Runbook_Estado_2026-06-02.md` (§4 pasos a seguir).*
