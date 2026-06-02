# LEN — Flujo de Conectividad
## Conekta (MX) · LEN · Celo Blockchain · Banrural (GT)

**Versión:** 1.0 — Documento de presentación técnica  
**Fecha:** 2026-04-29  
**Propósito:** Explicar el flujo completo de dinero en el corredor México–Guatemala usando LEN como capa de liquidación

---

## 1. PANORAMA GENERAL

LEN conecta tres capas distintas:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA FIAT (Dinero tradicional)               │
│                                                                     │
│   MÉXICO                              GUATEMALA                     │
│   Conekta                             Banrural GT                   │
│   (SPEI · Tarjeta · OXXO)             (ACH · Transferencia GTQ)     │
│                                                                     │
└───────────────────┬─────────────────────────┬───────────────────────┘
                    │                         │
                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA LEN (Orquestador)                       │
│                                                                     │
│   API Routes Next.js                                                │
│   ├── Verificación KYC/AML                                          │
│   ├── Control de límites regulatorios                               │
│   ├── Registro en Firestore                                         │
│   └── Firma de transacciones blockchain                             │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA BLOCKCHAIN (Celo Network)                   │
│                                                                     │
│   Smart Contracts ERC-20 (MondegaFactory)                           │
│   ├── MEXCOIN  — 1:1 con MXN                                        │
│   └── QUETZA   — 1:1 con GTQ                                        │
│                                                                     │
│   Operaciones: mint · burn · transfer · swap                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. PARTICIPANTES Y ROLES

| Participante | Rol | Lo que aporta |
|---|---|---|
| **Conekta** | Procesador de pagos MX | Recibe MXN via SPEI/tarjeta/OXXO. Genera CLABE virtual por usuario. Dispara webhooks. |
| **LEN** | Orquestador / emisor de tokens | Conecta fiat ↔ blockchain. Controla mint/burn de MEXCOIN y QUETZA. KYC/AML. |
| **Celo Network** | Blockchain de liquidación | Red L1 pública, bajo costo (~$0.001/tx), compatible con EVM. MiniPay wallet integrado. |
| **MEXCOIN** | Token MXN on-chain | ERC-20, 2 decimales, 1:1 con MXN. Solo LEN puede mintear/quemar. |
| **QUETZA** | Token GTQ on-chain | ERC-20, 2 decimales, 1:1 con GTQ. Solo LEN puede mintear/quemar. |
| **Banrural GT** | Banco receptor Guatemala | Cuenta en GTQ donde LEN deposita el equivalente. API de transferencias salientes. |
| **Usuario MX** | Remitente | Tiene wallet Celo + cuenta Conekta LEN. |
| **Usuario GT** | Receptor | Tiene wallet Celo + cuenta bancaria GTQ en Banrural. |

---

## 3. FLUJO COMPLETO: ENVÍO MX → GT

### Descripción narrativa
Carlos (México) quiere enviar $1,000 MXN a María (Guatemala).  
María recibirá ~Q260 GTQ en su cuenta Banrural.

### Diagrama de secuencia

```
Carlos MX          LEN Backend          Celo Network         María GT
    │                   │                    │                    │
    │ 1. Deposita MXN   │                    │                    │
    │ vía SPEI          │                    │                    │
    │─────────────────► │                    │                    │
    │                   │                    │                    │
    │ (Conekta dispara  │                    │                    │
    │  webhook POST     │                    │                    │
    │  /api/webhooks/   │                    │                    │
    │  conekta/deposit) │                    │                    │
    │                   │                    │                    │
    │                   │ 2. Verifica firma  │                    │
    │                   │    HMAC webhook    │                    │
    │                   │                    │                    │
    │                   │ 3. Mint MEXCOIN    │                    │
    │                   │ 1,000 MEXCOIN      │                    │
    │                   │────────────────►   │                    │
    │                   │                    │                    │
    │ 4. LEN notifica   │                    │                    │
    │ "Saldo disponible"│                    │                    │
    │◄──────────────────│                    │                    │
    │                   │                    │                    │
    │ 5. Carlos elige   │                    │                    │
    │ enviar a María    │                    │                    │
    │─────────────────► │                    │                    │
    │                   │                    │                    │
    │                   │ 6. Aplica TC FX    │                    │
    │                   │ MXN→GTQ: x0.267   │                    │
    │                   │ = Q267.00 GTQ      │                    │
    │                   │                    │                    │
    │                   │ 7. Burn MEXCOIN    │                    │
    │                   │    1,000 MEXCOIN   │                    │
    │                   │────────────────►   │                    │
    │                   │                    │                    │
    │                   │ 8. Mint QUETZA     │                    │
    │                   │    267 QUETZA      │                    │
    │                   │ (wallet de María)  │                    │
    │                   │────────────────────────────────────────►│
    │                   │                    │                    │
    │                   │ 9. Burn QUETZA     │                    │
    │                   │    267 QUETZA      │                    │
    │                   │◄────────────────────────────────────────│
    │                   │                    │                    │
    │                   │ 10. LEN → Banrural │                    │
    │                   │  API: transfer     │                    │
    │                   │  Q267 GTQ a cuenta │                    │
    │                   │  de María          │                    │
    │                   │                    │  11. María recibe  │
    │                   │                    │  Q267 en su banco  │
    │                   │                    │                    │◄┤
    │                   │                    │                    │
    │ 12. Confirmación  │                    │                    │
    │ "Enviado"         │                    │                    │
    │◄──────────────────│                    │                    │
```

### Pasos técnicos detallados

| Paso | Acción | API involucrada | Tiempo |
|------|--------|----------------|--------|
| 1 | Carlos hace SPEI a CLABE de LEN en Conekta | Conekta SPEI recibido | 0-30 min |
| 2 | Conekta dispara webhook `order.paid` a LEN | `POST /api/webhooks/conekta/deposit` | Inmediato |
| 3 | LEN verifica firma HMAC-SHA256 del webhook | `verifyConektaWebhook()` | <100ms |
| 4 | LEN mintea 1,000 MEXCOIN en wallet de Carlos | `MEXCOIN.mint(carlos_address, 100000)` | ~2 seg (Celo) |
| 5 | Carlos confirma envío desde app LEN | `POST /api/transfers/send` + JWT | Inmediato |
| 6 | LEN consulta tipo de cambio MXN/GTQ en tiempo real | Oracle de precios o feed Banrural | <200ms |
| 7 | LEN quema MEXCOIN de Carlos | `MEXCOIN.burn(carlos_address, 100000)` | ~2 seg (Celo) |
| 8 | LEN mintea QUETZA en wallet de María | `QUETZA.mint(maria_address, 26700)` | ~2 seg (Celo) |
| 9 | LEN quema QUETZA de María (o María autoriza) | `QUETZA.burn(maria_address, 26700)` | ~2 seg (Celo) |
| 10 | LEN llama API Banrural para transferencia GTQ | `POST /banrural/transfers` | <5 seg |
| 11 | María recibe Q267 en cuenta bancaria | Sistema ACH Guatemala | 0-2 horas |
| **Total** | | | **~15 min – 2 horas** |

---

## 4. FLUJO INVERSO: GT → MX

### Descripción
María (Guatemala) deposita Q500 GTQ a cuenta LEN en Banrural.  
Carlos recibe ~$1,870 MXN via SPEI.

```
María GT           LEN Backend          Celo Network         Carlos MX
    │                   │                    │                    │
    │ 1. Depósito GTQ   │                    │                    │
    │ a cuenta Banrural │                    │                    │
    │ de LEN            │                    │                    │
    │─────────────────► │                    │                    │
    │                   │                    │                    │
    │ (Banrural webhook │                    │                    │
    │  o polling API)   │                    │                    │
    │                   │                    │                    │
    │                   │ 2. Mint QUETZA     │                    │
    │                   │    500 QUETZA      │                    │
    │                   │────────────────────────────────────────►│
    │                   │                    │                    │
    │ 3. María elige    │                    │                    │
    │ enviar a Carlos   │                    │                    │
    │─────────────────► │                    │                    │
    │                   │                    │                    │
    │                   │ 4. TC FX GTQ→MXN   │                    │
    │                   │ x3.75 = $1,875 MXN │                    │
    │                   │                    │                    │
    │                   │ 5. Burn QUETZA     │                    │
    │                   │    500 QUETZA      │                    │
    │                   │◄────────────────────────────────────────│
    │                   │                    │                    │
    │                   │ 6. Mint MEXCOIN    │                    │
    │                   │    1,875 MEXCOIN   │                    │
    │                   │──────────────────────────────────────── ►│
    │                   │                    │                    │
    │                   │ 7. Burn MEXCOIN    │                    │
    │                   │    1,875 MEXCOIN   │                    │
    │                   │────────────────────────────────────────►│
    │                   │                    │                    │
    │                   │ 8. Conekta SPEI    │                    │
    │                   │ saliente →         │                    │
    │                   │ CLABE de Carlos    │                    │
    │                   │────────────────────────────────────────►│
    │                   │                    │  9. Carlos recibe  │
    │                   │                    │  $1,875 MXN SPEI   │
    │                   │                    │                   ◄┤
```

---

## 5. CONECTIVIDAD DE APIs

### 5.1 Conekta (México)

**Rol:** On-ramp y off-ramp de MXN

| Operación | Endpoint Conekta | Dirección |
|-----------|-----------------|-----------|
| Recibir SPEI | Webhook `order.paid` → `POST /api/webhooks/conekta/deposit` | Conekta → LEN |
| Recibir pago tarjeta | Webhook `charge.paid` → `POST /api/webhooks/conekta/card` | Conekta → LEN |
| Enviar SPEI saliente | `POST /api/v1/payouts` | LEN → Conekta |
| Crear orden pago | `POST /api/v1/orders` | LEN → Conekta |
| Verificar estado | `GET /api/v1/orders/{id}` | LEN → Conekta |

**Autenticación:** API Key privada en header `Authorization: Basic {base64(api_key:)}`  
**Webhook seguridad:** HMAC-SHA256 en header `Conekta-Signature`  
**Entorno sandbox:** `api.conekta.io` con API key de prueba  

**Métodos de pago disponibles:**
```
SPEI    → CLABE virtual por usuario (18 dígitos)
Tarjeta → Visa / Mastercard / AMEX
OXXO    → Voucher con referencia de 16 dígitos
```

---

### 5.2 LEN Backend (Orquestador)

**Rol:** Cerebro del sistema — conecta fiat con blockchain

| Endpoint LEN | Función |
|-------------|---------|
| `POST /api/webhooks/conekta/deposit` | Recibe notificación de depósito MXN → mintea MEXCOIN |
| `POST /api/webhooks/conekta/card` | Pago con tarjeta LEN → quema MEXCOIN |
| `POST /api/webhooks/banrural/deposit` | Recibe notificación de depósito GTQ → mintea QUETZA |
| `POST /api/transfers/send` | Usuario ejecuta envío cross-border |
| `POST /api/transfers/withdraw` | MEXCOIN/QUETZA → fiat (SPEI o transferencia GTQ) |
| `POST /api/auth/token` | Emite JWT firmado HS256 |
| `POST /api/pomelo/authorize` | Auth en tiempo real de tarjeta Pomelo/Mastercard |

**Stack:** Next.js 14 · Firebase Admin SDK · viem · jose

---

### 5.3 Celo Network (Blockchain)

**Rol:** Libro mayor inmutable, liquidación instantánea 24/7

| Operación | Contrato | Costo estimado |
|-----------|---------|----------------|
| mint MEXCOIN | `MondegaCoin.mint()` | ~$0.001 USD |
| burn MEXCOIN | `MondegaCoin.burn()` | ~$0.001 USD |
| mint QUETZA | `MondegaCoin.mint()` | ~$0.001 USD |
| burn QUETZA | `MondegaCoin.burn()` | ~$0.001 USD |
| transfer P2P | `ERC20.transfer()` | ~$0.001 USD |

**Contratos en Celo Sepolia (testnet):**
```
MEXCOIN:  0xAa0fF59Bbe62373D0954801abb51331d323f41A9
QUETZA:   0xba45b516C4fC485231863681B5ECc4E385105a13
Factory:  0x02Ec604E61c65E31618B74E47F7C861928C5AaEB
```

**Tiempo de confirmación:** ~2 segundos (Celo PoS)  
**Costo total por remesa:** < $0.01 USD (4 operaciones blockchain)

---

### 5.4 Banrural Guatemala

**Rol:** Off-ramp GTQ — depósito final al usuario guatemalteco

| Operación | Mecanismo | Estado |
|-----------|-----------|--------|
| Recibir depósito GTQ | Webhook Banrural o polling de cuenta | 🔴 Pendiente contrato |
| Enviar transferencia GTQ | API Banrural o ACH Guatemala | 🔴 Pendiente contrato |
| Consultar saldo cuenta LEN | `GET /cuenta/{id}/saldo` | 🔴 Pendiente contrato |

**Alternativas si Banrural no tiene API pública:**

| Proveedor | Descripción | Disponibilidad |
|-----------|-------------|---------------|
| **Visa Direct / MC Send** | Transferencia instantánea a cualquier tarjeta GT | Disponible, requiere contrato con banco emisor |
| **ACH Guatemala** | Cámara de compensación Guatemala, 1-2 días hábiles | Acceso via Banrural/BAC |
| **BAC Guatemala** | API más madura que Banrural | Disponible para fintech |
| **Número de cuenta manual** | Depósito manual por operador LEN (fase 0) | Inmediato, no escalable |

---

## 6. TIPO DE CAMBIO (FX)

### Modelo de precio
LEN aplica el tipo de cambio **en el momento del burn** (no en el depósito).  
Esto protege a LEN de riesgo cambiario durante el tránsito.

```
Ejemplo con TC real:
  $1,000 MXN ─── TC MXN/GTQ: 0.267 ───► Q267.00 GTQ
  Comisión LEN: 0.3% = $3.00 MXN
  Usuario recibe: Q266.20 GTQ

  Ventaja vs banco:
  TC bancario típico: 0.255  →  Q255.00 GTQ
  TC LEN:             0.267  →  Q266.20 GTQ
  Ahorro para el usuario: ~Q11 GTQ por cada $1,000 MXN
```

### Fuentes de tipo de cambio
| Fuente | Tipo | Precisión |
|--------|------|-----------|
| Banco de México (Banxico) | Oficial MXN/USD | Diario |
| Banguat (Banco de Guatemala) | Oficial GTQ/USD | Diario |
| Xe.com / Open Exchange Rates API | Mercado en tiempo real | Cada minuto |
| **LEN calcula:** MXN/GTQ = (MXN/USD) × (USD/GTQ) | Cruzado | Tiempo real |

---

## 7. MODELO DE SEGURIDAD EN EL FLUJO

```
PUNTO DE ENTRADA               MECANISMO DE SEGURIDAD
─────────────────────────────────────────────────────────
Webhook Conekta     →   HMAC-SHA256 (header Conekta-Signature)
Webhook Banrural    →   HMAC-SHA256 (header personalizado)
API LEN (usuario)   →   JWT firmado HS256 (jose, 24h expiración)
Contratos Celo      →   Roles: solo MINTER_ROLE puede mintear
                         Solo BURNER_ROLE puede quemar
                         Solo LEN treasury tiene ambos roles
Firestore           →   Firebase Admin SDK (bypasa rules)
                         Client SDK: todo denegado
Tipo de cambio      →   Ventana de 5 min para ejecutar al TC cotizado
                         Pasado el tiempo: recotizar automáticamente
Límites AML/UIF     →   $50,000 MXN por transacción
                         $200,000 MXN diarios por usuario
```

---

## 8. COMPARACIÓN VS SISTEMA ACTUAL

| Métrica | Banco tradicional | Western Union / Remitly | **LEN** |
|---------|-----------------|------------------------|---------|
| Costo total | 3–5% | 2–4% | **0.3%** |
| Tiempo | 1–3 días hábiles | 0–24 horas | **<2 horas** |
| Horario | L–V 9am–5pm | 24/7 (solo digital) | **24/7** |
| Tipo de cambio | Bancario oficial (peor) | Spot menos 1–2% | **Spot menos 0.1%** |
| Mínimo | $500 MXN | $100 MXN | **Sin mínimo** |
| Infraestructura requerida | Cuenta bancaria ambos | Tarjeta o cuenta | **Solo teléfono** |

---

## 9. REQUISITOS PARA ACTIVAR CADA INTEGRACIÓN

### Conekta (México) — Estimado 2–4 semanas
```
□ Cuenta empresarial en conekta.io
□ RFC de la empresa mexicana
□ Contrato de procesamiento firmado
□ Webhook URL configurado: https://len.app/api/webhooks/conekta/*
□ API Key de producción
□ CLABE empresarial de LEN (para recibir fondos)
□ Activar payout API (requiere verificación adicional)
```

### Celo Mainnet — Estimado 1 día
```
□ Comprar ~5 CELO real (~$3 USD) para gas
□ Enviar a wallet deployer: 0x792E9F32b5EF9CF0Dcc5E66EaEB01A12E1bbbED9
□ Ejecutar: cd blockchain && pnpm deploy:celo
□ Actualizar .env.local:
     CELO_ENV=mainnet
     MEXCOIN_CONTRACT_ADDRESS=<nueva dirección mainnet>
```

### Banrural Guatemala — Estimado 4–8 semanas
```
□ Reunión con área de negocios Banrural
□ Cuenta empresarial en GTQ (requiere presencia legal en GT o representante)
□ Acceso a API de Banca Empresarial Banrural
□ Configurar webhook o polling de cuenta
□ Acuerdo de comisiones por transferencias salientes
□ Alternativamente: BAC Guatemala (API más accesible)
```

---

## 10. HOJA DE RUTA DE IMPLEMENTACIÓN

```
SEMANA 1–2:   Sandbox Conekta completo
              → Webhooks de depósito SPEI funcionando
              → Minteo MEXCOIN en Celo testnet al recibir pago

SEMANA 3–4:   Celo Mainnet
              → Deploy MEXCOIN y QUETZA en mainnet real
              → Primer pago real con tarjeta Pomelo

SEMANA 5–8:   Negociación Banrural / BAC Guatemala
              → Cuenta empresarial GTQ
              → API de transferencias salientes
              → Minteo QUETZA en mainnet

SEMANA 9–12:  Primer corredor completo MX→GT en producción
              → Beta cerrada con 10–50 usuarios
              → Monitoreo de tipo de cambio
              → AML/KYC real con Pomelo

Q3 2026:      Escala — GT→MX, múltiples bancos, más corredores
```

---

## 11. PUNTOS CLAVE PARA LA PRESENTACIÓN

> **"Nosotros no movemos dinero — movemos la representación del dinero."**

1. **Celo es invisible para el usuario.** El usuario ve "mandé $1,000 a María" — no ve MEXCOIN, no ve blockchain, no ve wallets.

2. **El dinero nunca cruza fronteras.** En México siempre hay MXN. En Guatemala siempre hay GTQ. Celo es el puente de información, no de fondos.

3. **Conekta ya resolvió el onramp MX.** Millones de mexicanos ya pagan con SPEI/tarjeta/OXXO en Conekta — LEN aprovecha esa infraestructura.

4. **Costo 10x menor que el banco.** 0.3% vs 3–5%. En una remesa de $5,000 MXN: banco cobra $150–$250, LEN cobra $15.

5. **Auditable en tiempo real.** Cada transacción tiene un hash en Celo Explorer. El usuario puede verificar su dinero en cualquier momento.

---

*Documento generado: 2026-04-29 | Para uso interno y presentaciones con socios estratégicos*
