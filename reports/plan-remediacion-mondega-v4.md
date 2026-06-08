# Plan de Remediación MONDEGA v4 — Camino a Go-Live con Dinero Real

**Fecha:** 2026-06-06 · **Base:** v3 + v2 + v1 + `reports/auditoria-go-live.md` · **Estado:** plan oficial de trabajo.
**Qué cambia vs v3** (se conserva TODO el núcleo de v3):
1. **Pre-Fase 0 resuelta con evidencia del contrato** ⭐ — `MondegaCoin.sol` es ERC-20 **libre con blacklist (no allowlist)**; hoy custodial solo por ausencia de feature. Decisión recomendada: **forzar Opción A en el contrato**.
2. **Génesis reconcilia también el supply on-chain huérfano** ⭐ — no solo clasifica el ledger.
3. **El track externo arranca YA, en paralelo** ⭐ — auditoría de contratos y marco regulatorio son los polos más largos y gatean el go-live abierto.
4. **Sizing grueso por fase** ⭐ — para priorizar y comprometer fechas.
5. **Las sagas nuevas (reversión de depósito, FX) pasan por el mismo outbox idempotente** ⭐ — explícito, para no duplicar burns compensatorios.

---

## 0. Pre-Fase 0 — Decisión de circulación on-chain *(resuelta con evidencia en v4)*

> **Pregunta bloqueante: ¿los tokens pueden salir a wallets externas que el usuario controla (self-custody)?**

Si un usuario controla sus tokens en una wallet propia y los transfiere, el ledger no se entera y `supply_on_chain ≠ pasivo_en_ledger` **por diseño**. La invariante sería falsa desde el primer movimiento externo.

### Evidencia (v4 — verificado en código)
`blockchain/contracts/MondegaCoin.sol`:
- ERC-20 OZ v5 con **blacklist** en `_update` (`MondegaCoin.sol:90-101`) — solo bloquea direcciones baneadas (AML). **No es allowlist.**
- `pause`/`unpause` + roles mint/burn/compliance. **Ninguna restricción de que las transferencias ocurran solo entre wallets del sistema.**

**Diagnóstico:**
| Nivel | Realidad |
|---|---|
| Contrato | **Opción B** (token libre): cualquier dirección no baneada transfiere → el contrato NO garantiza la invariante |
| App hoy | **Custodial en la práctica**: el usuario no controla llaves, no hay "retirar a tu wallet"; el retiro va al banco → opera como Opción A **por ausencia de feature** |

**Decisión recomendada (AC de Pre-Fase 0):**
> **Opción A enforced** — restringir transferencias del token a wallets del sistema (allowlist en el contrato) **o** deshabilitar transfers de usuario, de modo que la invariante sea verdadera **por diseño** y no por accidente. Documentarlo en `/docs/money-architecture.md`. Si en el futuro se quiere self-custody (Opción B), el modelo de verdad cambia y este plan se revisa.

*El resto del documento asume Opción A enforced.*

---

## 1. Principio rector *(igual — correcto)*

> **El ledger off-chain (Firestore) es la fuente única de verdad. El token on-chain (Celo) es un espejo derivado.**

Mint/burn nunca originan estado: reflejan lo que el ledger ya decidió, vía **outbox + worker idempotente**. No existe ACID entre Firestore y Celo. Una sola contabilidad manda; la otra se deriva.

### La invariante del sistema *(rediseñada en v3, vigente)*
```
reserva_bancaria_confirmada == pasivo_liquidado + Σ(reservas_in-flight_rastreadas) == supply_on_chain   ± residuo_redondeo
```
- Lo **in-flight se mide exacto** (suma de montos reservados en sagas abiertas: depósito, retiro, FX), no se estima.
- La **tolerancia es solo para residuo de redondeo** (≈0). Una banda difusa escondería un goteo → prohibida.
- Desviación fuera de `residuo_redondeo` → **freeze automático de mint/burn** + alerta. Es el proof-of-reserves vivo.
- **Por-moneda (Fase 3):** `reserva_GTQ` y `reserva_MXN` cuadran cada una con su propio in-flight.

---

## 2. Hallazgo de fondo
Bloqueantes #1, #2, #3 = **una sola enfermedad: no hay máquina de estados del dinero con fronteras verificadas.** Ambas fronteras (entrada y salida) necesitan compensación.

---

## 3. Fases (orden con dependencias + sizing grueso)

> Sizing = estimación de ingeniería, **sujeta a dependencias externas** (señal del banco, ceremonia de llaves, proveedor KYC). No incluye los polos externos (auditoría/regulatorio), que corren en paralelo (§Track externo).

### Pre-Fase 0 — Decisión self-custody · **~0.5 día** *(bloquea todo)*
Decidir y documentar Opción A enforced (dato del contrato ya disponible, §0). Si A: planear el cambio de contrato (restricción de transfer) dentro de Fase 1/2 con su redeploy + migración.

### Fase 0 — Verificación + GÉNESIS · **~2-3 días** *(bloquea todo)*
| Tarea | Criterio de aceptación |
|-------|------------------------|
| **0.1** `/docs/money-architecture.md` (ledger=verdad, outbox, invariante con in-flight medido, qué congela, autoridad de mint, + decisión Pre-Fase 0) | Doc commiteado; todo PR lo referencia |
| **0.2** Mapear TODOS los write-paths del dinero (cada `set/update` del ledger vs cada `mint/burn`), por flujo | Lista archivo:línea; confirma rutas y si ledger/on-chain se tocan en el mismo flujo |
| **0.3 ⭐ GÉNESIS — ancla en el banco + supply on-chain** *(ampliado v4)* | (a) Clasificar **cada saldo** del ledger como respaldado-real vs demo **conciliando contra el extracto de Banrural** (no asumir que "demo"=sin respaldo); purgar solo lo no respaldado. (b) **Reconciliar el supply on-chain huérfano** (tokens minteados en pruebas que no corresponden a pasivo): quemar/contabilizar. **AC:** en el estado génesis, `reserva_banco == pasivo_ledger == supply_on_chain` (± redondeo) ANTES de encender el freeze |

> Sin 0.3, el freeze salta el día 1. Mal hecho, destruye pasivos reales (purgar "demo" que eran depósitos) o deja supply fantasma.

### Fase 1 — Máquina de estados del dinero · **~2-3 semanas** *(GO/NO-GO · no paralelizar)*
Cierra #1, #2, #3 + C11 + C13 + C9 + reversión de depósito + webhook endurecido.

| Tarea | Qué hace | AC |
|-------|----------|-----|
| **1.0 Webhook endurecido** *(prerrequisito de 1.1)* | Anti-replay (timestamp firmado, rechazo >5min) + **Admin SDK** (Cuenca hoy usa SDK cliente → falla con rules cerradas) + compare timing-safe + idempotencia atómica | Replay rechazado; escribe vía Admin SDK; doble entrega concurrente = un solo efecto. **Sin esto, 1.1 no sale a prod** |
| **1.1 Saga de depósito** | Acredita el ledger **solo tras** settlement confirmado; estado `confirmado→revertido` con **burn compensatorio** dentro de la ventana de clawback (fraude/contracargo/devolución), manejando "el usuario ya gastó el saldo" | Depósito no-liquidado → pasivo=0; reversión bancaria revierte/compensa; reserva nunca < pasivo, **ni tras clawback**; tests |
| **1.2 Saga de retiro** | `reservado→pagado→confirmado→quemado` con compensación si el pago falla | Falla inyectada revierte el saldo; cero fondos perdidos en 1.000 retiros con fallas aleatorias |
| **1.3 Outbox de mint/burn** | Ledger escribe evento outbox; worker idempotente lo refleja on-chain (cubre TOCTOU doble-mint, C11). ⭐v4: **las sagas de reversión de depósito y FX usan el MISMO outbox** — un burn/mint compensatorio nunca se duplica | Reprocesar el mismo evento N veces = un solo efecto; revert/reorg de Celo no descuadra el ledger |
| **1.4 Reconciliador continuo + freeze** | Recalcula la invariante (in-flight medido exacto + residuo de redondeo); fuera de tolerancia → congela mint/burn + alerta | Desbalance simulado → freeze <1 min; operación normal NO lo dispara; **un goteo bajo la antigua "banda" SÍ se detecta** |
| **1.5 Audit log append-only** | Cada write del ledger → entrada inmutable (quién/cuándo/monto/estado previo y posterior) | Auditado desde la PRIMERA operación |
| **1.6 Authz + retiro de `transfers/*`** (C9) | Retirar/atar al token `api/transfers/send\|withdraw` (hoy confían en wallet del body); toda autoridad se ata al `userId` del token | Ningún endpoint mueve/quema desde una dirección del body; grep confirma |
| **1.7 Tests de invariante/saga** | TDD de 1.0–1.4 | Los AC de F1 son tests reales |

### Fase 2 — Custodia y durabilidad · **~1-1.5 semanas** *(cierra #7 + custodia mint)*
| Tarea | AC |
|-------|-----|
| **2.1** Backups Firestore con point-in-time recovery | Restauración de prueba a instante arbitrario, verificada |
| **2.2 ⭐ Custodia de la autoridad de mint** | Hot-key del worker con **tope diario**; **multisig (Gnosis Safe)** para montos altos y cambios de rol; operator ≠ owner. *(Depende de ceremonia de llaves.)* | Comprometer la hot-key NO permite mint ilimitado; cambio de rol exige multisig |
| **2.3** Observabilidad: logging estructurado (pino/Sentry) + redacción PII + alertas | Alerta de invariante / saga atascada / gas treasury bajo / crash-loop a canal real <1 min |

### Fase 3 — FX + tesorería cross-border · **~1-2 semanas (3.5 puede extenderse: decisión de negocio)** *(cierra #8)*
| Tarea | AC |
|-------|-----|
| **3.1** Tasa en vivo (no hardcodeada) + timestamp + fallback + cotización vinculante (quoteId con expiración real) | Tasa vencida bloquea; el servidor honra el quote o recotiza explícitamente |
| **3.2** Spread explícito y registrado por operación | Cada conversión guarda tasa base, spread y quién absorbe el riesgo |
| **3.3 Conversión como SAGA de primera clase** | Toca dos reservas con latencia + tasa externa → saga con compensación (mismo outbox). Sin esto hay ventana donde reserva_GTQ bajó pero pasivo_MXN no subió | Falla inyectada a mitad deja estado consistente; las invariantes por moneda nunca quedan mal por una conversión en curso (in-flight rastreado) |
| **3.4** Invariante por moneda (`reserva_GTQ`, `reserva_MXN`) | El reconciliador valida ambas por separado |
| **3.5 ⭐ Modelo de liquidez/tesorería cross-border** | ¿Quién tiene inventario MXN para pagar en México? ¿Cómo se rebalancea GTQ-en-Banrural ↔ MXN-en-MX **sin USD**? Ventana de riesgo cambiario. *(Puede requerir socio/decisión de negocio.)* | Documento de tesorería + límite de exposición por moneda; sin esto el corredor GT→MX se queda sin liquidez de salida |

### Fase 4 — Controles AML/KYC · **~2-3 semanas (depende del proveedor KYC)** *(cierra #4, #5, #6 como software)*
| Tarea | AC |
|-------|-----|
| **4.1** Límites por nivel KYC que **bloquean** en `wallet/transfer\|deposit\|withdraw` + webhooks | L0 no supera su tope; la transacción se **rechaza** |
| **4.2** Verificación de identidad real (liveness/OCR) + screening sanciones/PEP/OFAC | Onboarding sin verificación no habilita operar |
| **4.3** Monitoreo por umbral (≥US$10K) + agregación diaria/mensual + estructuración | Operaciones que cruzan/fraccionan el umbral quedan marcadas |

> **Track regulatorio (paralelo, no software):** el reporte ante UIF/IVE-SIB corre por **Banrural como entidad regulada**. El software solo provee controles y datos.

### Fase 5 — Consolidación de tests de invariante · **~1 semana (arrancan en F1)** *(cierra #9)*
| Tarea | AC |
|-------|-----|
| Property/concurrencia: miles de transferencias simultáneas | La suma total **nunca** cambia; reserva = pasivo = supply siempre (in-flight medido) |
| Saga con fallas inyectadas (depósito **+ reversión**, retiro, **FX**) | Toda falla termina consistente; cero dinero creado/perdido |
| Gate en CI | Pipeline rojo bloquea el merge |

### Track externo ⭐ — **ARRANCA HOY, en paralelo** *(polos más largos; gatean el go-live abierto)*
| Track | Lead time típico | Acción inmediata |
|-------|------------------|------------------|
| **Auditoría externa de smart contracts** (mainnet) | ~3-6 semanas | Cotizar/contratar auditor ya; incluir el cambio de contrato de Pre-Fase 0 en el alcance |
| **Marco regulatorio con Banrural** (responsable AML ante SIB) | semanas-meses | Definir en la mesa con Banrural quién reporta y bajo qué licencia |
| **Pen-test** | ~1-2 semanas | Agendar antes de abrir al público |

---

## 4. Matriz: hallazgo → fase

| Hallazgo | Sev | Fase |
|---|---|---|
| C1 Sin reconciliación / proof-of-reserves | 🔴 | F1.4 |
| C2 Retiro quema antes de pagar, sin rollback | 🔴 | F1.2 |
| C3 Depósito minteado sin verificar ingreso | 🔴 | F1.1 |
| Reversión de depósito post-settlement | 🔴 | F1.1 |
| C4 Límites KYC cosméticos | 🔴 | F4.1 |
| C5 Sin verificación identidad / sanciones | 🔴 | F4.2 |
| C6 Sin detección ≥US$10K / structuring | 🔴 | F4.3 |
| C7 Sin backups / retención | 🔴 | F2.1 + F1.5 |
| C8 Tasas FX hardcodeadas | 🔴 | F3.1 |
| FX no atómico (saga) | 🔴 | F3.3 |
| C9 `transfers/*` confían en wallet del body | 🔴 | F1.6 |
| C10 Cuenca sin anti-replay + SDK cliente | 🔴 | F1.0 |
| C11 Idempotencia webhooks TOCTOU | 🔴 | F1.3 |
| C12 Cero tests de caminos de dinero | 🔴 | F1.7 + F5 |
| C13 Firestore write sin try/catch post-on-chain | 🔴 | F1 |
| Custodia mint (hot-key, multisig) | 🔴 | F2.2 |
| Circulación on-chain / self-custody | 🔴 | Pre-Fase 0 |
| Banda de tolerancia esconde goteo | 🔴 | F1.4 |
| Supply on-chain huérfano en génesis ⭐ | 🔴 | F0.3 |
| Auditoría externa contratos / regulatorio | 🔴 | Track externo (arranca hoy) |
| (8 🟡 / 6 🟢) | 🟡🟢 | repartir tras F1 |

---

## 5. Puertas de salida (Go / No-Go)

**Piloto cerrado (dinero real acotado, usuarios conocidos, topes bajos):**
- ✅ Pre-Fase 0 resuelta (Opción A enforced, o decisión documentada)
- ✅ Fase 0 completa, **génesis cuadrado contra el banco + supply on-chain reconciliado**
- ✅ Fase 1 completa (webhook 1.0, reversión de depósito 1.1, authz 1.6, audit log 1.5)
- ✅ Fase 2: backups (2.1) + custodia básica de mint con tope diario (2.2)
- ✅ Verificación básica de identidad (F4.2)
- Sin esto, ni piloto.

**Go-live abierto:**
- ✅ Fases 1–5 completas
- ✅ Auditoría externa de contratos + multisig treasury activos
- ✅ Modelo de tesorería cross-border (F3.5) operando
- ✅ Marco regulatorio con Banrural confirmado
- ✅ Invariante en verde durante ventana de soak con tráfico real de piloto
- ✅ Plan de rollback probado

---

## 6. Riesgos del plan
- **Circulación on-chain (máxima prioridad):** el contrato es libre (Opción B); hoy custodial por accidente. Forzar Opción A o la invariante es falsa por diseño. *(Resuelto el diagnóstico; falta ejecutar el enforcement.)*
- **Génesis (ledger + on-chain):** anclar al extracto del banco; reconciliar supply huérfano; no purgar a ciegas.
- **Reversión de depósito:** los rieles revierten después de confirmar; sin saga de reversión, un clawback deja reserva < pasivo.
- **Orden del webhook:** F1.1 depende de F1.0; no sacar depósito a prod con el webhook viejo.
- **Banda difusa:** medir in-flight exacto; tolerancia solo para redondeo.
- **Señal de settlement bancario:** confirmar con Banrural (webhook vs conciliación por extracto) antes de F1.
- **No paralelizar Fase 1.**
- **Liquidez cross-border (F3.5):** sin inventario MXN + rebalanceo, el corredor GT→MX no tiene con qué pagar aunque la invariante cuadre.
- **Hot-key de mint:** hasta tener multisig/tope (F2.2), es el mayor punto único de falla; limitar montos en piloto.
- **Polos externos largos:** auditoría/regulatorio arrancan hoy o retrasan el go-live abierto semanas.

---

## 7. Prompts para Claude Code (por fase)

**Pre-Fase 0 (ya respondida — solo falta decisión + planear enforcement):**
> Diagnóstico hecho: `MondegaCoin.sol` es ERC-20 libre con blacklist (no allowlist). Decisión a tomar: ¿se restringe la transferencia a wallets del sistema (Opción A enforced)? Si sí, planear el cambio de contrato + redeploy + migración dentro de F1/F2.

**Fase 0 (verificación + génesis):**
```
Sin modificar código: (1) listame con archivo:línea todos los write-paths del
dinero por flujo (depósito, retiro, transfer, FX) y si ledger/on-chain se tocan
en el mismo flujo. (2) Clasificá cada saldo del ledger en respaldado-real vs
demo y dame el método para conciliarlo contra el extracto de Banrural. (3) Leé
el supply on-chain real (totalSupply por token) y compará contra el pasivo del
ledger; reportá el supply huérfano a reconciliar. Devolveme diagrama de caminos
+ reporte de delta por moneda (ledger vs banco vs on-chain). No toques nada.
```

**Fase 1 (máquina de estados):**
```
Implementá la máquina de estados del dinero según /docs/money-architecture.md:
ledger Firestore = verdad; mint/burn = espejo vía outbox idempotente (el mismo
outbox para depósito, retiro, reversión y FX — sin duplicar compensatorios).
(0) Endurecé PRIMERO el webhook: anti-replay (timestamp firmado, rechazo >5min),
Admin SDK, compare timing-safe, idempotencia atómica.
(1) Depósito como saga: acredita solo tras settlement; estado confirmado→revertido
con burn compensatorio dentro de la ventana de clawback.
(2) Retiro: saga reservado→pagado→confirmado→quemado con compensación.
(3) Reconciliador continuo con in-flight MEDIDO EXACTO y tolerancia solo para
redondeo; congela mint/burn fuera de tolerancia.
(4) Audit log append-only en cada write.
(5) Retirá/atá al token los transfers/* que confían en la wallet del body.
Tests: inyectá fallas de pago, revert on-chain y reversión bancaria de depósito;
probá que no se crea ni se pierde dinero. Citá archivo:línea de cada cambio.
```

---
*Plan v4 · 2026-06-06 · plan oficial. Próxima auditoría: re-correr `auditoria-go-live.md` tras Fase 1 y comparar contra el "antes".*
