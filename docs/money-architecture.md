# LEN — Arquitectura del Dinero (modelo oficial)

**Fecha:** 2026-06-07 · **Estado:** decisión cerrada. Todo PR de dinero referencia este documento.
🧑‍⚖️ Lo marcado requiere confirmación de abogado regulatorio por país (MX/GT/HN) antes de mover dinero real.

---

## 1. Principio rector
- **El ledger off-chain (Firestore) es la fuente única de verdad operativa.** El token on-chain (Celo) es **espejo derivado** vía outbox idempotente (no origina estado).
- **Invariante (viva, no reporte):** por moneda, `reserva_en_banco == pasivo_en_ledger + Σ(in-flight) == supply_on_chain ± redondeo`. Fuera de tolerancia → **freeze** de mint/burn + alerta.

## 2. Custodia — banco ↔ persona (NO LEN)
- **Cada persona tiene su PROPIA cuenta en el banco** (CLABE individual en MX vía Conekta; cuenta Banrural individual en GT, aperturada digital estilo Fri; BAC en HN). **Sin fideicomiso.**
- **LEN nunca custodia fondos.** El dinero vive en la cuenta del banco de la persona. La relación de custodia es **banco↔persona**, LEN no está en medio.
- **Siempre hay una cuenta LEN interna** (`account_number`) por usuario — es el **ancla de identidad/AML + clave del ledger**, NO una cuenta de custodia.
- → Cierra el riesgo de **captación / cuasi-banco**.

## 3. Ingreso — comisión de servicio (NO spread)
- Al depositar, el **saldo propio del cliente se digitaliza 1:1** (GTQ → quetzal digital, **misma moneda**, no es cambio de divisa). Eso es un **servicio**, y LEN cobra una **comisión de servicio** por digitalizar/movilizar.
- El cliente **NO "compra un activo" a LEN**: el token es la **representación de su propio saldo**.
- → Cierra el riesgo de **casa de cambio** en el lado doméstico y evita el sabor a **VASP** (no se vende un activo).

## 4. FX cross-border — tasa pass-through del banco, liquidación off-system
- El "tipo de cambio" QUETZA→MEXCOIN es entre **representaciones digitales internas de LEN**, y **refleja la tasa real a la que liquidan los bancos (pass-through, SIN margen de LEN).**
- El **FX real y la liquidación cross-border los ejecutan los bancos**, fuera del sistema LEN (acuerdos banco-a-banco). → **LEN no tiene tesorería ni float cross-border.**
- LEN gana en el **servicio**, no en el diferencial de tasa.
- → Cierra el riesgo de **casa de cambio / transmisor** en la pata FX.
- 🧑‍⚖️ Los acuerdos banco-a-banco deben existir **por contrato** (el "off-system" tiene que ser real ante el regulador).

## 5. Modelo técnico — un ledger + settlement_mode + CountryRail
- **Núcleo compartido (country-agnostic):** `account_number`, ledger único, invariante, sagas, outbox, FX (opera sobre `coin`, no país).
- **`settlement_mode` (dato + default por país):** `individual` (cuenta propia) | `concentradora` (fallback para quien aún no tiene cuenta de banco). Default = `individual` en MX/GT/HN.
- **`CountryRail` (adapter por país):** lo único que ramifica por país — apertura/vinculación de cuenta (token estilo Fri), webhook de settlement, payout. Conekta/Banrural/BAC. El núcleo llama `getRail(country)`, nunca `if (country)`.
- Clave canónica de reconciliación: `bank_account_number ?? account_number`.

## 6. Riesgos legales — estado
| Riesgo | Estado |
|---|---|
| Captación / cuasi-banco | ✅ cerrado (cuenta individual del banco; LEN no custodia) |
| Casa de cambio (doméstico) | ✅ cerrado (digitalización misma-moneda = servicio) |
| Casa de cambio / transmisor (FX) | ✅ cerrado si tasa = pass-through del banco y LEN gana en servicio |
| Tesorería cross-border | ✅ ya no es de LEN (bancos liquidan) |
| VASP / token 1:1 | 🧑‍⚖️ confirmar tratamiento por país (e-money vs activo virtual) |
| Acuerdos banco-a-banco reales | 🧑‍⚖️ documentar por contrato |
| KYC/KYB + AML (≥US$10K, retención) | 🔴 pendiente de construir (plan v4 / cumplimiento) |

## 7. Reglas de oro (para todo PR de dinero)
1. LEN nunca custodia: el dinero va a la cuenta del banco de la persona.
2. La tasa interna refleja la del banco (pass-through, sin margen). LEN gana en la comisión de servicio.
3. El token es representación del saldo propio, no un activo vendido.
4. El núcleo no conoce `country` — solo `coin` y `settlement_mode`. El país vive en `CountryRail`.
5. Nada de dinero real sin: abogado 🧑‍⚖️ + KYB + invariante/reconciliación + backups.
