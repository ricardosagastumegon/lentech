# Plan de Remediación MONDEGA v2 — Camino a Go-Live con Dinero Real

**Fecha:** 2026-06-06 · **Revisa y amplía:** `plan-remediacion-mondega.md` (v1) + `reports/auditoria-go-live.md`
**Qué cambia vs v1:** se conserva el núcleo (ledger = verdad, outbox espejo, invariante viva + freeze) y se **agregan 6 piezas faltantes** que en v1 dejaban agujeros de dinero real: (1) custodia de la autoridad de mint, (2) auditoría externa de contratos en las gates, (3) authz de `transfers/*`, (4) FX como problema de **liquidez/tesorería cross-border**, (5) **génesis del delta existente** como tarea bloqueante de Fase 0, (6) webhook Cuenca. Más ajustes: banda de tolerancia de la invariante, audit log dentro de Fase 1, y el track regulatorio/externo explícito.

---

## 1. Principio rector *(igual que v1 — es correcto)*

> **El ledger off-chain (Firestore) es la fuente única de verdad. El token on-chain (Celo) es un espejo derivado.**

Mint/burn nunca originan estado: reflejan lo que el ledger ya decidió, vía **outbox + worker idempotente**. No existe ACID entre Firestore y Celo (async, revert, gas). Una sola contabilidad manda; la otra se deriva.

### La invariante del sistema *(ajustada en v2)*
```
reserva_bancaria_confirmada == pasivo_total_en_ledger == supply_on_chain
```
**Ajuste v2 (importante):** la invariante se evalúa sobre **estado liquidado + montos reservados in-flight**, con una **banda de tolerancia mínima** (residuo de redondeo + operaciones pendientes en saga). El `== 0` exacto y naive haría saltar el freeze en operación normal. Definir la tolerancia y el modelo de in-flight es parte de Fase 1.4.
- Desviación fuera de banda → **freeze automático de mint y burn** + alerta.
- Es el proof-of-reserves vivo, no un reporte mensual.
- **Extensión por-moneda (Fase 3):** `reserva_GTQ` y `reserva_MXN` cuadran cada una por separado.

---

## 2. Hallazgo de fondo *(igual que v1)*
Los bloqueantes #1, #2 y #3 son **una sola enfermedad: no hay máquina de estados del dinero con fronteras verificadas.**

| # | Hallazgo | Qué es | Se cierra en |
|---|----------|--------|--------------|
| 1 | Sin reconciliación / proof-of-reserves | Nada chequea la invariante | F1.4 |
| 3 | Mintea sin verificar ingreso bancario | Frontera de **entrada** rota | F1.1 |
| 2 | Quema antes de pagar, sin rollback | Frontera de **salida** rota (saga sin compensación) | F1.2 |

---

## 3. Fases (orden con dependencias)

### Fase 0 — Decisión + GÉNESIS *(bloquea todo · ~1-2 días)*

| Tarea | Criterio de aceptación |
|-------|------------------------|
| **0.1** `/docs/money-architecture.md`: ledger=verdad, on-chain=espejo, outbox, invariante+banda, qué congela, **modelo de autoridad de mint** | Doc revisado y commiteado; todo PR posterior lo referencia |
| **0.2** Mapear TODOS los write-paths del dinero (cada `set/update` del ledger vs cada `mint/burn`), agrupados por flujo | Lista exhaustiva archivo:línea; confirma cuántas rutas y si ledger/on-chain se tocan en el mismo flujo |
| **0.3 ⭐ GÉNESIS / delta existente** *(NUEVO en v2 — bloqueante)* | Medir el delta actual: suma `len_balances` vs `totalSupply()` on-chain vs reservas reales. **Purgar/migrar la data demo** (los usuarios demo tienen saldo en ledger SIN reserva ni supply → la invariante saltaría al arrancar). Establecer un **estado inicial cuadrado**. **AC:** invariante dentro de banda en el estado génesis ANTES de encender el freeze |

> Sin 0.3, el freeze se dispara solo el día 1. Es la "tarea oculta" de v1, ahora explícita y bloqueante.

### Fase 1 — Máquina de estados del dinero *(GO/NO-GO real · no paralelizar)*
Cierra #1, #2, #3 + idempotencia (C11) + consistencia post-on-chain (C13) + **authz (C9)**.

| Tarea | Qué hace | Criterio de aceptación |
|-------|----------|------------------------|
| **1.1 Pipeline de depósito** | Acredita el ledger **solo tras** settlement bancario confirmado (webhook/conciliación), nunca al iniciar | Depósito iniciado-no-liquidado → pasivo = 0; reserva nunca < pasivo; test que lo prueba |
| **1.2 Saga de retiro** | `reservado → pagado → confirmado → quemado`, con **compensación** automática si el pago falla | Falla inyectada revierte el saldo; cero fondos perdidos en 1.000 retiros con fallas aleatorias |
| **1.3 Outbox de mint/burn** | Ledger escribe evento outbox; worker idempotente lo refleja on-chain; reintentos seguros *(cubre el TOCTOU de doble-mint, C11)* | Reprocesar el mismo evento N veces = un solo mint; revert/reorg de Celo no descuadra el ledger |
| **1.4 Reconciliador continuo + freeze** | Recalcula la invariante (con banda + in-flight); si fuera de banda, congela mint/burn y alerta | Desbalance simulado dispara freeze < 1 min; operación normal NO lo dispara |
| **1.5 Audit log append-only** *(movido de F2 a F1)* | Cada write del ledger emite entrada inmutable (quién/cuándo/monto/estado previo y posterior) | La máquina de estados queda auditada desde su PRIMERA operación, no después |
| **1.6 Authz + retiro de `transfers/*`** *(NUEVO — C9)* | Reemplazar/retirar `api/transfers/send|withdraw` (confían en wallet del body); toda autoridad de movimiento se ata al `userId` del token | Ningún endpoint mueve/quema fondos a partir de una dirección del body; grep confirma `transfers/*` retiradas o atadas al token |
| **1.7 Tests de invariante/saga** *(arrancan aquí; se consolidan en F5)* | TDD de 1.1–1.4 | Los AC de F1 son tests reales, no manuales |

### Fase 2 — Custodia, durabilidad y webhooks *(cierra #7 + custodia mint + C10)*

| Tarea | Criterio de aceptación |
|-------|------------------------|
| **2.1** Backups Firestore con **point-in-time recovery** | Restauración de prueba a un instante arbitrario, verificada |
| **2.2 ⭐ Custodia de la autoridad de mint** *(NUEVO en v2)* | Hot-key del worker con **tope diario**; **multisig (Gnosis Safe)** para montos altos y cambios de rol; operator separado del owner. **AC:** comprometer la hot-key NO permite mint ilimitado; cambio de rol exige multisig |
| **2.3 Webhooks** *(C10)* | Cuenca: **anti-replay** (firmar timestamp, rechazar >5 min) + **Admin SDK** (hoy usa SDK cliente → falla con rules cerradas) + compare timing-safe real. Confirmar idempotencia atómica en todos | Webhook replay rechazado; Cuenca escribe vía Admin SDK; doble entrega concurrente = un solo efecto |
| **2.4** Observabilidad: logging estructurado (pino/Sentry) con redacción de PII + alertas | Alerta de invariante / saga atascada / gas treasury bajo / crash-loop llega a canal real < 1 min |

### Fase 3 — FX + tesorería cross-border *(cierra #8 — y el problema central del negocio)*

> Al convertir GTQ↔MXN dejás de ser 1:1: hay **dos reservas, en dos países, y un libro de FX**.

| Tarea | Criterio de aceptación |
|-------|------------------------|
| **3.1** Fuente de tasa en vivo (no hardcodeada) con timestamp, fallback y **cotización vinculante** (quoteId con expiración real, no cosmética) | Tasa vencida bloquea la conversión; el servidor honra el quote emitido o recotiza explícitamente |
| **3.2** Spread explícito y registrado por operación | Cada conversión guarda tasa base, spread y quién absorbe el riesgo |
| **3.3** Invariante **por moneda** (`reserva_GTQ`, `reserva_MXN` cuadran cada una) | El reconciliador valida ambas reservas por separado |
| **3.4 ⭐ Modelo de liquidez/tesorería cross-border** *(NUEVO en v2)* | Definir: ¿quién tiene el inventario MXN para pagar en México?, ¿cómo se **rebalancea** GTQ-en-Banrural ↔ MXN-en-MX **sin USD**?, ventana de riesgo cambiario. **AC:** documento de tesorería + límite de exposición por moneda; sin esto un corredor GT→MX se queda sin liquidez de salida |

### Fase 4 — Controles AML/KYC *(cierra #4, #5, #6 como software)*

| Tarea | Criterio de aceptación |
|-------|------------------------|
| **4.1** Límites por nivel KYC que **bloquean de verdad** en `wallet/transfer|deposit|withdraw` + webhooks | Usuario L0 no supera su tope; la transacción se **rechaza** (no se loguea y pasa) |
| **4.2** Verificación de identidad real (proveedor: liveness/OCR) + screening sanciones/PEP/OFAC | Onboarding sin verificación no habilita operar |
| **4.3** Monitoreo por umbral (≥US$10K) + agregación diaria/mensual + detección de estructuración | Operaciones que cruzan/ fraccionan el umbral quedan marcadas para revisión |

> **Nota regulatoria (track paralelo, no software):** la **responsabilidad de reporte ante UIF / IVE-SIB** corre por **Banrural como entidad regulada**. Definir el modelo legal con Banrural en paralelo; el software solo provee los controles y los datos.

### Fase 5 — Consolidación de tests de invariante *(cierra #9)*

| Tarea | Criterio de aceptación |
|-------|------------------------|
| Property/concurrencia: miles de transferencias simultáneas | La suma total del sistema **nunca** cambia; reserva = pasivo = supply siempre (dentro de banda) |
| Saga con fallas inyectadas (depósito y retiro) | Toda falla termina en estado consistente; cero dinero creado/perdido |
| Gate en CI: ningún merge si los tests de invariante fallan | Pipeline rojo bloquea el merge |

### Track externo *(en paralelo — no es código, pero condiciona el go-live abierto)*
- **Auditoría externa de los smart contracts** (mainnet, manejan valor). *(NUEVO en v2 en las gates)*
- **Marco regulatorio con Banrural** (responsable AML ante SIB).
- **Pen-test** antes de abrir al público.

---

## 4. Matriz: hallazgo → fase *(13 🔴 de la auditoría)*

| Hallazgo (anexo auditoría) | Sev | Fase |
|---|---|---|
| C1 Sin reconciliación / proof-of-reserves | 🔴 | F1.4 |
| C2 Retiro quema antes de pagar, sin rollback | 🔴 | F1.2 |
| C3 Depósito minteado sin verificar ingreso | 🔴 | F1.1 |
| C4 Límites KYC cosméticos | 🔴 | F4.1 |
| C5 Sin verificación identidad / sanciones | 🔴 | F4.2 |
| C6 Sin detección ≥US$10K / structuring | 🔴 | F4.3 |
| C7 Sin backups / retención | 🔴 | F2.1 + F1.5 |
| C8 Tasas FX hardcodeadas | 🔴 | F3 |
| C9 `transfers/*` confían en wallet del body | 🔴 | **F1.6 (NUEVO)** |
| C10 Cuenca sin anti-replay + SDK cliente | 🔴 | **F2.3 (NUEVO)** |
| C11 Idempotencia webhooks TOCTOU (doble mint) | 🔴 | F1.3 (outbox) |
| C12 Cero tests de caminos de dinero | 🔴 | F1.7 + F5 |
| C13 Firestore write sin try/catch post-on-chain | 🔴 | F1 (máquina de estados) |
| Custodia mint (hot-key, multisig) | 🔴* | **F2.2 (NUEVO)** |
| Auditoría externa contratos | 🔴* | **Track externo (NUEVO)** |
| (8 🟡 / 6 🟢) | 🟡🟢 | repartir tras F1 |

\* No estaban en la matriz de v1; vienen de la auditoría / análisis.

---

## 5. Puertas de salida (Go / No-Go) *(ampliadas en v2)*

**Piloto cerrado (dinero real acotado, usuarios conocidos, topes bajos):**
- ✅ Fase 0 completa **incluida 0.3 génesis** (estado inicial cuadrado)
- ✅ Fase 1 completa y verificada (incluye authz 1.6 y audit log 1.5)
- ✅ Fase 2: al menos backups (2.1) + custodia básica de mint con tope diario (2.2)
- Sin esto, ni piloto.

**Go-live abierto:**
- ✅ Fases 1–5 completas
- ✅ **Auditoría externa de contratos** + **multisig treasury** activos *(NUEVO)*
- ✅ **Marco regulatorio con Banrural** confirmado *(NUEVO)*
- ✅ Invariante en verde durante ventana de soak con tráfico real de piloto
- ✅ Plan de rollback probado

---

## 6. Riesgos del plan *(v1 + nuevos)*
- **Delta existente (ahora Fase 0.3):** la data demo descuadra la invariante desde el arranque. Medir y cuadrar antes del freeze. *(elevado a tarea bloqueante)*
- **Señal de settlement bancario:** F1.1 depende de una señal confiable de "el dinero entró". Si Banrural no la da por webhook, construir conciliación por extracto. Confirmar con Banrural antes de F1.
- **No paralelizar Fase 1:** sus tareas comparten la máquina de estados; en paralelo crean carreras.
- **Liquidez cross-border (nuevo):** sin inventario MXN y rebalanceo (F3.4), el corredor GT→MX se queda sin con qué pagar aunque la invariante cuadre. Es riesgo de negocio, no solo técnico.
- **Hot-key de mint (nuevo):** mientras no exista multisig/tope (F2.2), el worker del outbox es el mayor punto único de falla; limitar montos en piloto.

---

## 7. Prompts para Claude Code (por fase)

**Fase 0 (verificación + génesis — correr primero, sin tocar código en 0.2):**
```
Sin modificar código: (1) listame con archivo:línea todos los write-paths del
dinero (cada set/update de saldos en Firestore y cada mint/burn on-chain),
agrupados por flujo (depósito, retiro, transfer, FX), y confirmá si ledger y
on-chain se tocan en el mismo flujo. (2) Medí el delta actual: suma de
len_balances por moneda vs totalSupply() on-chain de cada token, e identificá
la data demo que tiene saldo en ledger sin respaldo. Devolveme el diagrama de
caminos y el reporte de delta. No toques nada todavía.
```

**Fase 1 (máquina de estados):**
```
Implementá la máquina de estados del dinero según /docs/money-architecture.md:
ledger Firestore = verdad; mint/burn = espejo vía outbox idempotente.
(1) Depósito: acredita solo tras confirmación de settlement bancario.
(2) Retiro: saga reservado→pagado→confirmado→quemado con compensación si el
pago falla. (3) Reconciliador continuo (con banda de tolerancia + in-flight)
que valida reserva==pasivo==supply y congela mint/burn ante desbalance.
(4) Audit log append-only en cada write del ledger. (5) Retirá/atá al token
los endpoints transfers/* que hoy confían en la wallet del body.
Escribí tests que inyecten fallas de pago y revert on-chain y prueben que no
se crea ni se pierde dinero. Citá archivo:línea de cada cambio.
```

---
*Plan v2 · 2026-06-06 · Próxima auditoría: re-correr `auditoria-go-live.md` tras Fase 1 y comparar contra el "antes".*
