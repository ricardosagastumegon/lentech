# LEN — Plan del Modelo Unificado (Arquitectura · Ingeniería · Legal)

**Fecha:** 2026-06-07 · **Base:** decisión de modelo unificado + `auditoria-go-live.md` + `plan-remediacion-mondega-v4.md`
**Método:** 3 subagentes en paralelo (product-architect/backend, money-flow/ledger, aml-compliance/security), lectura del código real con cita archivo:línea.

---

## Resumen ejecutivo — la decisión de fondo

**El modelo unificado que definiste es correcto:** *siempre una cuenta LEN por usuario (sujetos obligados) + UN solo ledger + invariante 1:1 + cross-border; lo único que varía por país es un atributo de **modo de liquidación** (`concentradora` | `individual`) detrás de un **adapter `CountryRail`**.* Arquitectura e ingeniería lo confirman: el ledger ya es agnóstico al país; solo el ruteo de depósito/retiro y la UI ramifican por país, y eso se colapsa en un solo eje sin tocar el núcleo contable. **Esto es seguro** (aísla el blast-radius: tocar GT no rompe MX) y **mantiene el cross-border** (un solo ledger).

**Pero hay una tensión que define la viabilidad del negocio — y es legal, no técnica:**

| | Lo que el modelo técnico quiere | Lo que el modelo legal exige |
|---|---|---|
| Custodia | Ledger LEN = fuente de verdad con saldos por usuario | El **banco** custodia; LEN no debe ser el custodio (o = captación / cuasi-banco) |
| Hoy en código | Implementa de facto **concentradora a nombre de LEN** (el más riesgoso) | — |
| FX cross-border | LEN aplica el spread (`fx-engine`/`commission-config`) | Si LEN se queda el spread, parece **casa de cambio** → licencia |

**La resolución (qué hacer):**
1. **Construir el modelo unificado** (ledger único + `settlement_mode` + `CountryRail`) — es la arquitectura correcta. ✅
2. **PERO con la custodia en el banco regulado**, no a nombre de LEN:
   - **MX → individual** (CLABE por usuario; custodia banco/IFPE detrás de Conekta). 🟢
   - **GT → concentradora COMO FIDEICOMISO administrado por Banrural** (no cuenta a nombre de LEN), o individual homologado. ⚠️
   - **HN → individual / fideicomiso-banco**, no concentradora-LEN. 🔴 pendiente.
   - El **ledger de LEN = espejo operativo + reconciliación** contra los saldos del banco, no el libro de pasivos del custodio.
3. **Los bancos ejecutan la transmisión y el FX; LEN cobra comisión de servicio tecnológico** (no spread propio) → evita licencia de transmisor/casa de cambio/VASP. 🧑‍⚖️
4. **Bloqueante de negocio actual:** no hay **KYB/UBO** → hoy LEN **no puede dar de alta legalmente a un cliente import/export (empresa)**. El caso de uso central está bloqueado en código (`identity.ts:88` fija siempre nivel 2 persona).
5. **🧑‍⚖️ Nada de lo legal es asesoría formal** — la estructura de custodia, la clasificación como transmisor/VASP y el tratamiento del spread FX **exigen abogado regulatorio en MX, GT y HN antes de mover dinero real.** Esa opinión define si el negocio es viable como "no banco".

> **En una frase:** construí el modelo unificado (es correcto y seguro), pero **la custodia va en el banco y el FX lo ejecuta el banco** — si no, LEN es cuasi-banco + casa de cambio sin licencia. Y sin KYB no podés ni dar de alta un cliente comercial.

---

# (Sección 1) Arquitectura

### Principio rector (heredado de v4)
El **ledger off-chain (Firestore) es la fuente única de verdad operativa**; el token on-chain es espejo vía outbox. La invariante `reserva_banco == pasivo_ledger == supply_on_chain` (± redondeo) es una sola, global, con desglose por moneda. El país pasa a ser **dato de configuración**, no bifurcación de código en el núcleo.

### Las tres capas (la regla: el país solo existe en el anillo externo)
**(a) Núcleo compartido — Identidad + Contabilidad (country-agnostic):** `account_number` por usuario (ancla AML + clave contable, ya en `users-db.ts:148`); **ledger único** (`ledger.ts`, no conoce `country`); invariante + reconciliador + freeze; sagas + outbox; FX bilateral (opera sobre `coin`, no país). *Capa más pequeña, pura y testeada — un bug aquí afecta a todos.*

**(b) Modo de liquidación — un atributo + default por país:** `settlement_mode: "concentradora" | "individual"`.
| País | Default | Riel | Override |
|---|---|---|---|
| MX | individual | Conekta (CLABE) | — |
| GT | concentradora | Banrural | → individual si homologa (por usuario) |
| HN | concentradora (pend.) | BAC | — |

Hoy está implícito en `account_type` + `depositRouting` (`account-number.ts:64`); hay que **explicitarlo** como `settlement_mode` con tabla de defaults.

**(c) `CountryRail` / adapter por país — SOLO la integración del riel:** una interfaz uniforme, una implementación por país (`MxConektaRail`, `GtBanruralRail`, `HnBacRail`). Cada una conoce su HMAC, formato de webhook, tiempos, longitudes de cuenta, payout — y emite/consume **eventos canónicos** (`SettlementConfirmed`, `PayoutExecuted`, `DepositReversed`) que el núcleo entiende sin saber de qué banco vienen.

### Por qué evita "arreglar GT y romper MX"
Hoy el conocimiento de país está esparcido en `switch (country)` dentro de rutas de dinero (`webhooks/conduit/deposit/route.ts:121`, `wallet/withdraw/route.ts:15,30`, `wallet/deposit/route.ts:16,49`). Tocar QUETZA edita el mismo archivo que mintea MEXCOIN → un copy-paste en `case "GT"` rompe `case "MX"`. Con la separación, GT vive **entero** en `GtBanruralRail`; tocarlo no abre el archivo de MX. El núcleo (donde un bug sería catastrófico) deja de editarse para "agregar un país".

### Cross-border sobre un solo ledger con modos distintos en cada extremo
Un GT→MX es **una sola operación de ledger**, no dos contabilidades que se sincronizan: el cross-border **no cruza un banco, cruza el ledger**. El modo `concentradora`/`individual` solo decide *cómo entra y sale el fiat* (capa c); el movimiento de valor entre usuarios es siempre off-chain en el ledger único. Ya está bien hecho en `wallet/transfer/route.ts:56-75` (ramifica por `coin`, no por país; FX server-side). El descalce físico GTQ-en-Banrural ↔ MXN-en-MX es **tesorería/liquidez (v4 §3.5)**, no contabilidad.

### Diagrama
```
 Usuario MX ┐   ┌── (a) NÚCLEO COMPARTIDO (country-agnostic) ──────────────┐
 Usuario GT ┼─► │  account_number (AML) · LEDGER único · invariante+freeze  │
 Usuario HN ┘   │  FX (coin↔coin) · sagas · outbox ──► Celo (espejo)        │
                └───────▲───────────────────────────────▲───────────────────┘
                        │ eventos canónicos              │
                ┌───────┴──── (b) settlement_mode (dato + default país) ─────┐
                │   MX=individual · GT=concentradora · HN=pend.              │
                └──▲───────────────▲───────────────▲────────────────────────┘
            ┌──────┴─────┐  ┌──────┴──────┐  ┌─────┴──────┐  (c) CountryRail
            │MxConektaRail│  │GtBanruralRail│  │  HnBacRail │  ← único lugar
            │ CLABE·SPEI  │  │ pool·ACH     │  │ pool·SIEFOM│    con país/HMAC
            └─────────────┘  └──────────────┘  └────────────┘
  Cross-border GT→MX: saldo QUETZA ─FX(núcleo)─► saldo MEXCOIN (un postEntries; sin banco en medio)
```

### Mapeo al código (qué conservar / refactorizar / crear)
- **Conservar:** `ledger.ts` (núcleo perfecto); `wallet/transfer/route.ts:56-75` (el patrón correcto); `account-number.ts` `canonicalAccount:33`/`isHomologated:41`/`depositRouting:64` (semilla); `celo-admin.ts:242 getTokenForCountry` (tabla país→coin); `users-db.ts:148`.
- **Refactorizar (ramifican por país en el dinero):** `webhooks/conduit/deposit/route.ts:121-146` (switch country + FX hardcoded + GT/HN NOT_IMPLEMENTED) → mover mint al outbox; `wallet/deposit/route.ts:16,49` y `wallet/withdraw/route.ts:15,30` (`COUNTRY_COIN` duplicado → fuente única); `account-number.ts:16-17,46-50` (`POOL_PREFIX`/`LEN_POOL_ACCOUNT` → mover a config de cada adapter; el `?? LEN_POOL_ACCOUNT.GT` de `:73` es fallback peligroso, debe fallar explícito); `account-number.ts:53` (`own|pooled` → `individual|concentradora`).
- **Crear:** `lib/country-rail.ts` (interfaz + registry `getRail`), `lib/rails/{mx-conekta,gt-banrural,hn-bac}.ts`, `lib/settlement-mode.ts` (tipo + defaults + `resolveSettlementMode`), campo `settlement_mode` en `LenUser`.

### Riesgos arquitectónicos
Drift de tablas país→coin/pool (una sola fuente + test); **fallback silencioso a GT** (`account-number.ts:73`, `withdraw:30`, `deposit:43 ?? "QUETZA"`) → el registry debe **lanzar** ante país desconocido, nunca defaultear; prohibir `country` en `ledger.ts`/sagas/outbox vía lint de CI; depósito concentradora sin referencia → cola de excepción manual, nunca acreditar a ciegas; cambio de modo (homologación) solo sin sagas in-flight; consolidar `transfers/*` legacy en el camino del ledger; `HnBacRail` como stub explícito (país-sin-riel = estado de primera clase, no bug).

---

# (Sección 2) Ingeniería

### 1. Modelo de datos final (`LenUser`, extender)
```ts
account_number:       string;          // canónico interno LEN (HOY opcional → hacer requerido)
account_type:         "virtual" | "bank";
bank_account_number?: string;          // CLABE (MX) o cuenta Banrural/BAC real, si homologada
settlement_mode:      "concentradora" | "individual";   // ← NUEVO eje único (override por usuario)
rail_provider?:       "banrural" | "conekta" | "stp" | "bac";
rail_account_ref?:    string;          // id de cuenta provisionada en el proveedor
```
Clave canónica de reconciliación intacta: `canonicalAccount() = bank_account_number ?? account_number` (`account-number.ts:33`).

Config nueva `lib/settlement-config.ts`:
```ts
export const SETTLEMENT_MODE_POR_PAIS = {
  MX: { default_mode:"individual",   provider:"conekta", pool_account:"20200", supports_individual:true  },
  GT: { default_mode:"concentradora",provider:"banrural",pool_account:"10100", supports_individual:true  },
  HN: { default_mode:"concentradora",provider:"bac",     pool_account:"30300", supports_individual:false },
};
export function resolveSettlementMode(u){ return u.settlement_mode ?? SETTLEMENT_MODE_POR_PAIS[u.country].default_mode; }
```

### 2. Interface `CountryRail` (adapter)
```ts
interface CountryRail {
  country; provider;
  provisionAccount(user): Promise<{account_type; bank_account_number?; rail_account_ref}>;
  depositRouting(user): DepositRoutingInfo;            // sustituye depositRouting + getUserDepositInfo
  parseSettlement(rawWebhook): Promise<{event; user_id}|null>;
  verifyWebhook(req, rawBody): Promise<boolean>;       // HMAC + anti-replay
  payout(req): Promise<PayoutResult>;                  // SPEI | ACH | SIEFOM
}
export function getRail(country): CountryRail; // registry; lanza si país desconocido
```
El core llama `getRail(user.country).<método>` — **cero `if (country)` en deposit/withdraw/transfer.**

### 3. Flujos sobre UN ledger según modo (el ledger NO cambia)
- **Depósito:** el usuario nunca acredita; el **webhook del riel** sí (v4 §1.1). `rail.parseSettlement` → `{event,user_id}`; comisión (`getCommissionRule("deposit")`+`calculateCommission`, igual que hoy `deposit/route.ts:45-46`) + `postEntries` con `entry_id=event.external_ref`. **Concentradora vs individual:** solo cambia cómo se asocia el ingreso al usuario (CLABE→usuario vs pool+`reference`). El asiento es idéntico.
- **Retiro:** saga `reservado→pagado→confirmado→quemado` (v4 §1.2) + `rail.payout()`. Solo `payout` cambia entre modos; el débito en ledger es idéntico.
- **Transfer P2P / Cross-border:** 100% interno al ledger (`transfer/route.ts:56-78`), **no toca rieles**, idéntico en todo país/modo. FX server-side (`fx-engine calculateFXQuote`). Pendiente: saga + quote vinculante (v4 §3.3).

### 4. Reconciliación por modo (misma invariante, distinta granularidad)
- **Concentradora (GT/HN):** `Σ(saldos del país en su coin) == saldo cuenta concentradora del país`.
- **Individual (MX):** `∀user: saldo_ledger(user,coin) == saldo de su cuenta`.
Una sola función reconcilia, parametrizada por modo, usando `canonicalAccount()` como clave. La homologación GT migra un usuario de "fila en el pool" a "su cuenta" **sin cambiar la invariante**, solo su granularidad.

### 5. Migración (sin romper el demo — defaults reproducen el comportamiento actual)
- **M0 Modelo de datos** (no-op): añadir campos a `LenUser`; `account_number` requerido; backfill `settlement_mode`=default país; crear `settlement-config.ts`. (v4 F0.2)
- **M1 Extraer `CountryRail`:** mover `depositRouting`/`getUserDepositInfo`(`add-money/page.tsx:13-58`)/`COUNTRY_COIN`(x3)/`DEPOSIT_MODEL`(`bank.store.ts:104-132`) a los adapters. Shims de compat. (v4 F0.2/prerreq F1)
- **M2 Core usa adapter:** deposit real vía webhook `rail.verifyWebhook`+`parseSettlement`→mismo `postEntries`; withdraw como saga + `rail.payout`. (v4 F1.0/1.1/1.2)
- **M3 Cross-border saga + por-moneda.** (v4 F3.3/3.4)
- **M4 Reconciliador parametrizado por modo + freeze.** (v4 F1.4)
Regla: cada paso deja defaults = hoy → demo sigue verde.

### 6. Tests
Invariante property-based (Σ por coin constante; concentradora=agregado, individual=1:1; homologación no cambia invariante); idempotencia/concurrencia (mismo `entry_id`/`external_ref` = un efecto; doble webhook = un crédito; `INSUFFICIENT_FUNDS`); sagas con fallas inyectadas (settlement no confirmado, reversión, payout falla, FX a mitad); por-modo (Conekta CLABE válida, Banrural pool+reference, override gana al default, BAC `NotImplemented`).

---

# (Sección 3) Legal y Cumplimiento

> 🧑‍⚖️ **No es asesoría legal.** Es ingeniería de cumplimiento + mapa de riesgo. La estructura de custodia, la licencia de transmisor/casa de cambio/VASP y los contratos con bancos **exigen abogado regulatorio en MX, GT y HN antes de mover dinero real.**

### 1. Concentradora vs Individual — la decisión legal central
| Modelo | Custodia | Cómo lo ve el regulador | Carga sobre LEN |
|---|---|---|---|
| **Concentradora a nombre de LEN** | LEN, una cuenta a su nombre, saldos en su ledger | LEN **capta y administra fondos del público** (cuasi-banco/IFPE); el usuario es acreedor de LEN | 🔴 ALTA — captación no autorizada; exige licencia / fideicomiso / dinero electrónico |
| **Individual (banco custodia)** | El **banco regulado**; cada usuario su cuenta/CLABE; LEN instruye | LEN = capa tecnológica/agente; el dinero **no es pasivo de LEN** | 🟢 BAJA — la licencia la tiene el banco |

Por país: **MX individual** (🟢, salvo que los SPEI entren a una CLABE concentradora de LEN → re-clasifica a IFPE Ley Fintech). **GT** ⚠️ la decisión más cara: si va concentradora, mitigar con **cuenta a nombre de Banrural / fideicomiso administrado por Banrural**, LEN solo instruye. **HN** 🔴 copiar modelo individual/custodia-banco.
> **Hoy el código implementa de facto el modelo concentradora-LEN** (ledger con saldos por usuario, sin reconciliación a reservas — auditoría §3.1) → el legalmente más arriesgado, sin estructura jurídica que lo soporte.

### 2. Sujeto regulado / sujeto obligado por país
| País | Regulador / UIF | Licencia | Sujeto obligado AML |
|---|---|---|---|
| MX | CNBV + UIF-SHCP | Conekta / IFPE / banco | El emisor/banco (y LEN si administra fondos) |
| GT | **IVE–SIB** | Banrural | Banrural (y LEN si administra) |
| HN | CNBS + UIF | BAC | BAC (y LEN según rol) |

🧑‍⚖️ **Bloqueante:** **acuerdo de reparto de responsabilidad AML** firmado con cada banco (quién hace KYC vinculante, quién presenta ROS/SAR, quién retiene, quién responde en inspección). Hoy **nadie del lado LEN reporta** (auditoría §4.3).

### 3. KYC / KYB — el corredor es B2B (import/export → empresas)
KYC persona: documento (INE/DPI/identidad), comprobante domicilio, **liveness+face-match+OCR**, screening **sanciones/PEP/OFAC**. KYB empresa: acta/patente/RTU/RFC/RTN, representante legal, **UBO ≥25% verificado**, objeto social (import/export = mayor riesgo, trade-based ML), origen de fondos.
| Requisito | Estado | Cita |
|---|---|---|
| Niveles KYC | ✅ | `identity.ts:30-35` |
| Límites aplicados | 🔴 cosméticos | `identity.ts:126-129` |
| Verificación real | 🔴 solo guarda foto | `identity.ts:57-99` |
| Sanciones/PEP | 🔴 no existe | grep=0 |
| **KYB/UBO** | 🔴 **inalcanzable** (`submitKyc` fija nivel 2) | `identity.ts:88` |
| KYC obligatorio | 🔴 opcional | — |
> **Implicación crítica:** el negocio es B2B pero el código solo llega a nivel 2 persona. **Hoy LEN no puede dar de alta legalmente a un cliente comercial.** Bloquea el caso de uso central.

### 4. AML operativo
Umbral ~**US$10K** equiv. + ROS/SAR sin importar monto; structuring (agregación por cliente); monitoreo; retención **5–10 años**. **Todo ausente** (detección ≥10K, agregación `daily_mxn` definido y no usado, ROS, retención, log inmutable — auditoría §4.3/4.4). El pitch afirma "monitoreo AML en tiempo real" → **falso respecto al código**; alinear o construir antes de afirmarlo.

### 5. Transmisión cross-border + FX — riesgo de licencia
Mover GT↔MX↔HN + FX MXN↔GTQ↔HNL = **transmisión de dinero + casa de cambio** (y los tokens on-chain pueden activar **VASP**). Mitigación: **que los bancos ejecuten transmisión y FX; LEN cobra comisión de servicio tecnológico, NO spread propio** (hoy LEN se queda el spread vía `fx-engine`/`commission-config` → apunta a casa de cambio). 🧑‍⚖️ **Bloqueante mayor:** opinión por país sobre si LEN es transmisor/VASP y bajo qué figura (agente del banco) opera sin licencia propia. *Define la viabilidad del negocio.*

### 6. Checklist legal — Piloto vs Go-Live
**Piloto cerrado:** opinión legal por país (sandbox/agente del banco) 🔴 · custodia-en-banco definida 🔴 · contrato + reparto AML con el banco 🔴 · KYC real + sanciones para participantes 🔴 · **KYB/UBO si hay empresas** 🔴 · límites KYC aplicados 🔴 · retención + backup/PITR + log inmutable 🔴 · aviso de privacidad 🟡 · montos/usuarios topados 🟡.
**Go-live abierto (+):** licencias/figura legal en 3 países 🔴 · custodia/fideicomiso formalizada 🔴 · detección ≥10K + structuring + ROS a UIF/IVE 🔴 · oficial de cumplimiento + manual PLD por país 🔴 · KYB/UBO operativo 🔴 · reconciliación/proof-of-reserves 🔴 · opinión sobre spread FX 🔴 · retención 5–10 años formalizada 🔴 · auditoría AML + pentest 🟡.

---

## Decisiones y siguiente paso

### Decisiones que NO son de código (las define negocio + abogado)
1. 🧑‍⚖️ **Custodia:** ¿GT concentradora-como-fideicomiso-Banrural o individual? ¿HN individual? (MX individual ya es claro). → define la carga regulatoria.
2. 🧑‍⚖️ **FX:** ¿el banco ejecuta el cambio y LEN cobra comisión de servicio? (sacar a LEN de "casa de cambio").
3. 🧑‍⚖️ **Figura legal cross-border** por país (agente del banco vs transmisor licenciado).
4. **Acuerdo de reparto AML** con Conekta/Banrural/BAC.

### Lo que SÍ es de código (orden recomendado, sin romper demo)
1. **M0–M1:** modelo de datos `settlement_mode` + `CountryRail` (colapsa la ramificación por país; bajo riesgo).
2. **KYB/UBO + límites KYC que bloqueen** (sin esto no hay cliente comercial ni AML real).
3. **El resto del plan v4** (sagas, reconciliación, invariante, backups) — ahora con peso legal, no solo técnico.

### Regla de oro del modelo unificado
> **Ledger único + `settlement_mode` + `CountryRail`** para la técnica · **custodia en el banco + FX ejecutado por el banco + AML/KYB completo** para lo legal. Las dos juntas, o LEN es cuasi-banco + casa de cambio sin licencia.

---

## ADENDA — Modelo final decidido (2026-06-07)

Tras la definición de negocio, el modelo quedó **cerrado** así (ver `docs/money-architecture.md`):

1. **Sin fideicomiso.** Banrural ya no hace fideicomiso; se **conecta** (como con Fri). LEN se conecta, no custodia.
2. **Cuenta individual del banco por persona** (CLABE en MX / Banrural en GT / BAC en HN), aperturada/vinculada digital. **Siempre** + una cuenta LEN interna (ancla AML/ledger). Custodia = **banco↔persona, NO LEN**.
3. **Ingreso = comisión de servicio** por digitalizar el saldo propio (GTQ→quetzal digital, misma moneda = servicio, no cambio de divisa). El token = **representación del saldo propio**, no un activo vendido.
4. **FX cross-border = tasa pass-through del banco** (sin margen de LEN); el **FX real y la liquidación los hacen los bancos off-system** (acuerdos banco-a-banco por contrato) → **LEN sin tesorería cross-border**.
5. **Técnico:** un ledger + `settlement_mode` (default `individual`) + `CountryRail` por país.

**Riesgos legales:** captación ✅, casa de cambio (doméstico) ✅, casa de cambio/transmisor FX ✅, tesorería cross-border ✅. Pendiente 🧑‍⚖️: tratamiento del token 1:1 por país (e-money vs activo virtual) + acuerdos banco-a-banco por contrato + KYB/AML por construir.

**Código iniciado (M0):** `lib/settlement-config.ts` (modos por país), campo `settlement_mode` en `LenUser`, asignación en `createUser`, seed actualizado. Siguiente: `CountryRail` (M1) + KYB + restructurar comisión como fee de servicio explícito.

---
*Plan del modelo unificado · 2026-06-07 · arquitectura + ingeniería + cumplimiento. Lo marcado 🧑‍⚖️ exige abogado regulatorio antes de dinero real.*
