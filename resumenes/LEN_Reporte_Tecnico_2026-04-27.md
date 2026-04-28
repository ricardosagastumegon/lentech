# LEN — REPORTE TÉCNICO COMPLETO
**Fecha**: 2026-04-27 | **Generado por**: Claude Code (check-env + debug-service + code-review)

---

## RESUMEN EJECUTIVO

| Área | Estado | Calificación |
|---|---|---|
| Variables de entorno | ⚠️ Incompleto | 4/10 |
| Seguridad | 🔴 Crítico | 5/10 |
| Servicios NestJS | ❌ No pueden correr | 2/10 |
| App web (Next.js) | ✅ Funcional en demo | 7/10 |
| Blockchain / Celo | ✅ Mainnet deployado | 9/10 |
| Lógica de negocio | ⚠️ Incompleta | 6/10 |

---

## 1. CHECK-ENV — VARIABLES DE ENTORNO

### apps/web/.env.local

| Variable | Estado | Nota |
|---|---|---|
| `CELO_ENV` | ⚠️ `testnet` | **CAMBIAR A `mainnet` EN RAILWAY** |
| `CELO_TREASURY_PRIVATE_KEY` | ❌ Placeholder `0x...` | **PONER LA CLAVE REAL EN RAILWAY** |
| `MEXCOIN_CONTRACT_ADDRESS` | ✅ `0xAa0fF59...` | Correcto |
| `LEN_JWT_SECRET` | ❌ No existe | El auth de API routes no funcionará |
| `CUENCA_API_KEY` | ❌ Vacía | Sin integración bancaria activa |
| `CUENCA_WEBHOOK_SECRET` | ❌ Vacía | Webhooks de depósito no verificarán firmas |
| `NEXT_PUBLIC_FIREBASE_*` | ✅ Configurado | OK |
| `POMELO_CLIENT_ID/SECRET` | ❌ Vacío | Tarjetas no disponibles |

### Servicios NestJS (auth, card, wallet, fx, compliance, notification, fiat-bridge)

| Servicio | Archivo .env | Estado |
|---|---|---|
| auth-service | ❌ No existe | Solo tiene `.env.example` |
| card-service | ❌ No existe | Solo tiene `.env.example` |
| wallet-service | ❌ No existe | Solo tiene `.env.example` |
| fx-engine | ❌ No existe | Solo tiene `.env.example` |
| compliance | ❌ No existe | Solo tiene `.env.example` |
| notification | ❌ No existe | Solo tiene `.env.example` |
| fiat-bridge | ❌ No existe | Solo tiene `.env.example` |

> **Ningún servicio NestJS puede arrancar localmente.** Solo la app web corre.

### Root .env (desarrollo)

| Variable | Estado | Nota |
|---|---|---|
| `DB_*` | ✅ Configurado | Solo para local |
| `JWT_SECRET` | ⚠️ Dev placeholder | `dev_secret_change...` — no usar en prod |
| `ENCRYPTION_KEY` | 🔴 `000...000` | Todos ceros — inseguro |
| `TWILIO_*` | ❌ `PENDIENTE` | SMS no funciona |
| `MARQETA_*` | 🗑️ Obsoleto | Marqeta fue reemplazado por Pomelo |
| `POLYGON_*` | 🗑️ Obsoleto | Migrado a Celo |
| `BANRURAL_*` | ❌ `PENDIENTE` | GT banking no implementado |

---

## 2. DEBUG-SERVICE — PROBLEMAS DE EJECUCIÓN

### 🔴 CRÍTICO: Retiro quema MEXCOIN pero nunca envía el SPEI

**Archivo**: `apps/web/src/app/api/transfers/withdraw/route.ts`

```
// TODO: encolar trabajo para enviar SPEI vía Pomelo/STP
// await queueSpeiTransfer(...)  ← COMENTADO
```

**Consecuencia**: Si un usuario hace un retiro hoy:
1. Sus MEXCOIN se queman en Celo ✅
2. El SPEI NUNCA llega a su banco ❌
3. El usuario pierde su dinero

**Fix requerido**: No habilitar retiros hasta tener proveedor SPEI (Conekta/STP) integrado.

### 🔴 CRÍTICO: Auth de producción no implementado

**Archivo**: `apps/web/src/app/api/auth/token/route.ts`

Solo funciona con usuarios demo (`demo-mx`, `demo-gt`, `demo-hn`) con PIN `111111`.
El path de producción retorna `404` para cualquier usuario real.

### ⚠️ Railway aún en testnet

Las variables en Railway NO han sido actualizadas:
- `CELO_ENV` sigue en `testnet`
- `CELO_TREASURY_PRIVATE_KEY` sigue siendo placeholder

Los depósitos SPEI reales intentarían mintear en Sepolia testnet, no en mainnet.

### ⚠️ Ningún servicio NestJS deployado

Solo están en Railway:
- `apps/web` ✅
- `apps/admin` ✅

Pendientes de deploy:
- `auth-service` — registro/login real bloqueado
- Los demás servicios ni tienen `.env`

---

## 3. CODE-REVIEW — HALLAZGOS DE SEGURIDAD Y CALIDAD

### 🔴 Firebase API Key hardcodeada como fallback

**Archivo**: `apps/web/src/lib/firebase.ts:8`

```typescript
apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCNHgU4WyhsaixGvfX9lj0gBGJFxg5aynU',
```

La API key de Firebase está hardcodeada en el código. Si alguien ve el source, tiene acceso directo.
**Fix**: Eliminar el fallback hardcodeado — si la variable no está, lanzar error.

### 🔴 Usuarios demo con PIN fijo en código de producción

**Archivo**: `apps/web/src/app/api/auth/token/route.ts`

```typescript
"demo-mx": { pin: "111111" },
"demo-gt": { pin: "111111" },
"demo-hn": { pin: "111111" },
```

Cualquiera puede autenticarse como usuario demo. Aceptable para demo, pero debe bloquearse antes de usuarios reales (agregar flag `DEMO_MODE=true` que lo habilite).

### 🔴 ENCRYPTION_KEY con todos ceros

**Archivo**: Root `.env`

```
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

Si algún servicio usa esta clave para cifrar PII, los datos están prácticamente en texto plano.

### 🟡 Referencia obsoleta a Marqeta

**Archivo**: `services/card-service/src/entities/card.entity.ts:18`

```typescript
issuerCardId!: string;  // Marqeta/Galileo card token
```

Solo un comentario, no afecta lógica. Actualizar comentario a "Pomelo card token".

### 🟡 Retiro no valida ownership de wallet

**Archivo**: `apps/web/src/app/api/transfers/withdraw/route.ts`

El endpoint recibe `wallet_address` del body pero no verifica que esa wallet pertenezca al `userId` autenticado. Un usuario podría intentar quemar MEXCOIN de otra wallet (si tiene acceso al token).

### 🟢 Lo que está bien

- ✅ Idempotencia en webhooks (Firestore check antes de procesar)
- ✅ HMAC-SHA256 con `timingSafeEqual` — correcto, previene timing attacks
- ✅ `parseUnits(amount, 2)` para MEXCOIN — decimales correctos
- ✅ Verificación de saldo antes de quemar
- ✅ Separación server/client en celo-admin.ts (sin `NEXT_PUBLIC_`)
- ✅ JWT con `jose` (Web Crypto, sin dependencias nativas)
- ✅ Validación de CLABE con regex

---

## 4. ESTADO DE PROVEEDORES

| Proveedor | Para qué | Estado |
|---|---|---|
| **Cuenca** | SPEI MX | Sin cuenta, código listo |
| **Conekta** | SPEI + pagos MX | Email enviado, respuesta Santiago Neira |
| **Pomelo / Natalia** | Tarjeta MX | Contacto activo |
| **Paymentology** | Tarjeta GT/HN | Identificado, sin contactar |
| **STP** | SPEI directo MX | No contactado |

---

## 5. PRIORIDADES — QUÉ HACER ANTES DE USUARIOS REALES

### 🔴 BLOQUEANTES (no lanzar sin esto)

1. **Deshabilitar endpoint de retiro** hasta tener SPEI saliente integrado
   - O agregar flag que lo bloquee: `WITHDRAWALS_ENABLED=false`
2. **Actualizar Railway** con variables mainnet:
   - `CELO_ENV=mainnet`
   - `CELO_TREASURY_PRIVATE_KEY=<clave real>`
   - `LEN_JWT_SECRET=<64 bytes aleatorio>`
3. **Implementar auth real** en `/api/auth/token` (conectar con Firestore + PIN hasheado)
4. **Confirmar proveedor SPEI** (Conekta o STP)

### 🟡 IMPORTANTE (antes de escalar)

5. Quitar Firebase API key hardcodeada del código
6. Agregar `DEMO_MODE` flag para controlar usuarios demo
7. Generar `ENCRYPTION_KEY` real (32 bytes aleatorios)
8. Validar que `wallet_address` en retiro pertenece al usuario autenticado
9. Deployar `auth-service` en Railway

### 🟢 PUEDE ESPERAR

10. Limpiar referencias a Marqeta y Polygon del root `.env`
11. Crear `.env` para servicios NestJS locales
12. Deployar servicios restantes (wallet, compliance, notification)

---

## 6. BLOCKCHAIN — ESTADO MAINNET ✅

Todos los contratos deployados y verificados en Celo Mainnet (chainId 42220):

| Contrato | Dirección |
|---|---|
| MondegaFactory | `0x02Ec604E61c65E31618B74E47F7C861928C5AaEB` |
| MEXCOIN | `0xAa0fF59Bbe62373D0954801abb51331d323f41A9` |
| QUETZA | `0xba45b516C4fC485231863681B5ECc4E385105a13` |
| LEMPI | `0x7d120f4e63937e944Fa5b1Ad97D38aC1C16D2e1A` |
| COLON | `0x546718C3565C417ddc0346a070B7f78325Fc8E78` |
| NICORD | `0x19de414D35820286ff5b274c7832dc653acaC76E` |
| TIKAL | `0xF1C588c10Ad6892267d0e49E24F58169F33deb9D` |
| CORI | `0xAcE18a308C51134ce752A9E2a179369b163b9e22` |
| DOLAR | `0x3b74B9f0d7c86A7e9BD4909cBBE4cDbE6F7276e8` |

Wallet admin: `0x792E9F32b5EF9CF0Dcc5E66EaEB01A12E1bbbED9` | Balance: ~4.99 CELO

---

*Reporte generado automáticamente con check-env + debug-service + code-review*
