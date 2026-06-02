# LEN — Estado Técnico y Operativo Completo
**Fecha:** 2026-04-27  
**Repo:** github.com/ricardosagastumegon/lentech  
**App LIVE:** https://web-production-1c372.up.railway.app  
**Versión documento:** v1.0

---

## RESUMEN EJECUTIVO

LEN es una red de monedas digitales regionales 1:1 para el corredor México–Guatemala–Honduras.  
Tokens activos: **MEXCOIN** (MXN) · **QUETZA** (GTQ) · **LEMPI** (HNL) — y 5 tokens adicionales deployados en testnet.

**Estado actual:** Demo funcional LIVE + contratos en Celo Sepolia + backend Pomelo BaaS integrado (código listo, pendiente credenciales). Buscando $500K–$1M seed.

---

## 1. QUÉ TENEMOS PROGRAMADO

### 1.1 Frontend — App Web (LIVE en Railway)

| Ruta | Función | Estado |
|------|---------|--------|
| `/` | Landing page | ✅ LIVE |
| `/login` | Login demo (3 wallets fijas) | ✅ LIVE |
| `/dashboard` | Balance + historial tiempo real | ✅ LIVE |
| `/send` | P2P cross-country con FX real | ✅ LIVE |
| `/receive` | QR + dirección de cobro | ✅ LIVE |
| `/transactions` | Historial de movimientos | ✅ LIVE |
| `/kyc` | Flujo de verificación de identidad | ✅ LIVE (mock) |
| `/add-money` | Carga de saldo | ✅ LIVE (mock) |
| `/buy-tokens` | Compra de tokens | ✅ LIVE (mock) |
| `/sell-tokens` | Venta de tokens | ✅ LIVE (mock) |
| `/pitch` | Pitch deck 15 slides bilingüe + PDF | ✅ LIVE |
| `/minipay` | Integración Celo/MiniPay wallet | ✅ LIVE |
| `/register` | Registro real de usuario | 🔴 "Próximamente" |

### 1.2 Admin Panel (buildeado, sin deploy)

- 21 bancos reales configurados (Banrural GT, BAC HN, STP MX, etc.)
- Queue de KYC/AML con aprobación/rechazo
- Parámetros de tipo de cambio FX en tiempo real
- Sincronización con Firestore
- **Estado:** build OK, pendiente deploy en Railway

### 1.3 Smart Contracts — Celo Sepolia Testnet

**Red:** Celo Sepolia | **ChainId:** 11142220 | **Deployado:** 2026-04-16

| Contrato | Dirección | Token |
|----------|-----------|-------|
| MondegaFactory | `0x02Ec604E61c65E31618B74E47F7C861928C5AaEB` | — |
| MEXCOIN | `0xAa0fF59Bbe62373D0954801abb51331d323f41A9` | MXN |
| QUETZA | `0xba45b516C4fC485231863681B5ECc4E385105a13` | GTQ |
| LEMPI | `0x7d120f4e63937e944Fa5b1Ad97D38aC1C16D2e1A` | HNL |
| COLON | `0x546718C3565C417ddc0346a070B7f78325Fc8E78` | SVC |
| NICORD | `0x19de414D35820286ff5b274c7832dc653acaC76E` | NIO |
| TIKAL | `0xF1C588c10Ad6892267d0e49E24F58169F33deb9D` | BZD |
| CORI | `0xAcE18a308C51134ce752A9E2a179369b163b9e22` | CRC |
| DOLAR | `0x3b74B9f0d7c86A7e9BD4909cBBE4cDbE6F7276e8` | USD |

Características del contrato:
- ERC-20 con roles separados: MINTER, BURNER, PAUSER, COMPLIANCE
- 2 decimales (igual que fiat, no 18 como ETH)
- Hook `_update()` para AML on-chain
- Compilado con `viaIR: true` para evitar stack-too-deep
- Deploy vía Factory (nunca directo)

### 1.4 Backend API — Integración Pomelo (código completo)

Todos los archivos escritos y compilando sin errores TypeScript.

#### Endpoints expuestos por LEN (Pomelo llama a estos):

| Método | Ruta | Función |
|--------|------|---------|
| POST | `/api/pomelo/authorize` | **Crítico.** Autorización en tiempo real (<5s). Aprueba/rechaza pagos con tarjeta LEN verificando saldo MEXCOIN en Celo. Respuesta firmada con HMAC-SHA256. |
| POST | `/api/webhooks/pomelo/transactions` | Notificaciones post-autorización. Quema MEXCOIN al confirmar pago, re-mintea en reversals. |
| POST | `/api/webhooks/pomelo/adjustments` | Ajustes forzados por Mastercard. No pueden rechazarse. |
| POST | `/api/webhooks/pomelo/deposit` | Depósito SPEI/carga → mintea MEXCOIN 1:1. |

#### Endpoints que LEN llama (LEN → Pomelo API):

| Función | Endpoint Pomelo | Cuándo |
|---------|----------------|--------|
| OAuth token | `POST /oauth/token` | Antes de cada llamada API |
| Crear usuario | `POST /users/v1/` | Al registrar nuevo usuario |
| Crear cuenta digital | `POST /core/accounts/v1` | Al onboarding |
| Movimiento digital | `POST /core/transactions/v1` | SPEI saliente (retiro MXN) |
| Bloquear tarjeta | `PATCH /cards/{id}/block` | AML/fraude |

#### Endpoints de transferencias P2P:

| Método | Ruta | Función |
|--------|------|---------|
| POST | `/api/transfers/send` | P2P MEXCOIN entre wallets Celo (ERC-20 transfer) |
| POST | `/api/transfers/withdraw` | MEXCOIN → MXN vía SPEI (burn + movimiento Pomelo) |

#### Librerías backend creadas:

| Archivo | Función |
|---------|---------|
| `src/lib/pomelo-client.ts` | OAuth 2.0 con token cache, HMAC-SHA256 firma/verificación en formato `hmac-sha256 <base64>`, helpers API |
| `src/lib/celo-admin.ts` | `mintMexcoin()`, `burnMexcoin()`, `getMexcoinBalanceServer()` — server-side con viem |
| `src/lib/minipay.ts` | Client-side: detecta MiniPay, lee balance, ejecuta transfers |
| `src/types/pomelo.ts` | Tipos TypeScript completos de la API Pomelo |

### 1.5 MCP Server Pomelo

- Conectado: `pomelo-api-ref → https://api-reference-mcp.pomelo.la/mcp`
- Herramientas disponibles: `list_topics`, `get_endpoint`, `search_endpoints`, `generate_request_example`, `list_endpoints_by_topic`
- Disponible en próximas sesiones de Claude Code para consultar la API directamente

### 1.6 Seguridad implementada

| Mecanismo | Detalle |
|-----------|---------|
| Verificación de webhooks | HMAC-SHA256 con comparación de tiempo constante (timing-safe) |
| Formato de firma Pomelo | `hmac-sha256 <base64>` — verificado contra docs reales del MCP |
| Headers verificados | `x-api-key` + `x-signature` + `x-timestamp` + `x-endpoint` |
| Firma de respuesta | LEN también firma sus respuestas de autorización hacia Pomelo |
| Idempotencia | Firestore `len_processed_webhooks` previene doble quemado |
| JWT decode | Extracción de `user_id` del token; **verificación de firma pendiente** |
| Firestore rules | Solo permite demo-gt, demo-mx, demo-hn (modo sandbox) |

---

## 2. QUÉ HACE FALTA

### 2.1 Crítico para producción (bloqueante)

| Item | Descripción | Responsable |
|------|-------------|-------------|
| 🔴 **Credenciales Pomelo** | `POMELO_CLIENT_ID`, `POMELO_CLIENT_SECRET`, `POMELO_WEBHOOK_SECRET`, `POMELO_WEBHOOK_API_KEY` | Registro en developers.pomelo.la |
| 🔴 **CELO mainnet** | Comprar ~0.3 CELO real (~$0.15 USD), send a `0x792E9F32...`, deploy MEXCOIN mainnet | Faucet → exchange → transfer |
| 🔴 **Firestore rules** | Abrir para usuarios reales, no solo demo | Dev |
| 🔴 **JWT verificación real** | Actualmente solo se hace decode sin verificar firma del token | Dev |
| 🔴 **Onboarding usuario** | Flujo completo: crear usuario Pomelo → KYC (INE/CURP) → cuenta digital → emitir tarjeta | Dev |

### 2.2 Importante (no bloqueante inmediato)

| Item | Descripción |
|------|-------------|
| 🟡 **Deploy apps/admin** | Railway, segundo servicio, ya está buildeado |
| 🟡 **Sistema de alertas** | PagerDuty/Slack cuando MEXCOIN se quema pero SPEI falla |
| 🟡 **Queue SPEI saliente** | El withdraw registra como `pending_spei` pero no ejecuta el `BANK_TRANSFER_OUT` automáticamente |
| 🟡 **Backend NestJS real** | Scaffolded pero vacío — auth real, wallet management, fiat bridge |
| 🟡 **Rate limiting** | Los endpoints de webhook no tienen rate limiting |
| 🟡 **Logs estructurados** | Console.log actual no es suficiente para producción (necesita Datadog/Sentry) |

### 2.3 Fase 2 (expansión)

| Item | Descripción |
|------|-------------|
| ⚪ **Guatemala** | Banrural API + QUETZA en mainnet |
| ⚪ **Honduras** | BAC HN API + LEMPI en mainnet |
| ⚪ **FX automático** | Swap MEXCOIN↔QUETZA↔LEMPI sin USD intermediario |
| ⚪ **Mobile app** | React Native/Expo (scaffolded, sin desarrollo) |
| ⚪ **Cross-border P2P** | Actualmente solo MEXCOIN→MEXCOIN; falta swap automático |
| ⚪ **Polygon** | Segunda cadena para redundancia |

---

## 3. NIVELES DE CONFIANZA

### Por componente

| Componente | Confianza | Notas |
|------------|-----------|-------|
| Smart contracts (lógica) | ⭐⭐⭐⭐⭐ | ERC-20 estándar OZ v5, bien probado en testnet |
| Smart contracts (seguridad) | ⭐⭐⭐☆☆ | Sin auditoría formal — necesario antes de mainnet con dinero real |
| Frontend demo | ⭐⭐⭐⭐⭐ | LIVE, funciona, usuarios lo pueden ver |
| MiniPay integration | ⭐⭐⭐⭐☆ | Código correcto, no probado en dispositivo real con MiniPay |
| pomelo-client.ts | ⭐⭐⭐⭐☆ | Construido con datos reales del MCP. Falta prueba en sandbox real |
| /api/pomelo/authorize | ⭐⭐⭐⭐☆ | Lógica correcta. Sin prueba de carga (debe responder <5s siempre) |
| /api/webhooks/* | ⭐⭐⭐⭐☆ | Idempotencia implementada. Firma verificada contra docs MCP |
| /api/transfers/withdraw | ⭐⭐⭐☆☆ | SPEI saliente registra `pending_spei` pero no lo ejecuta todavía |
| JWT auth | ⭐⭐☆☆☆ | Solo decode sin verificar firma — INSEGURO en producción |
| Firestore rules | ⭐⭐☆☆☆ | Abiertas en modo demo — no apto para usuarios reales |
| Onboarding usuario | ⭐☆☆☆☆ | No existe — bloqueante para el primer usuario real |

### Resumen de madurez

```
Listo para demo/pitch:   ████████████████████  100%
Listo para sandbox:      ████████████░░░░░░░░   60%  (falta credenciales + onboarding)
Listo para producción:   ████░░░░░░░░░░░░░░░░   20%  (falta auditoría + seguridad + ops)
```

---

## 4. SEGURIDAD DIGITAL Y OPERATIVA

### 4.1 Seguridad implementada (bien)

| Capa | Mecanismo | Estatus |
|------|-----------|---------|
| Webhook auth | HMAC-SHA256 timing-safe, formato correcto Pomelo | ✅ Implementado |
| Idempotencia | Firestore previene doble mint/burn por mismo evento | ✅ Implementado |
| Firma de respuesta | LEN firma respuestas de auth hacia Pomelo | ✅ Implementado |
| Balance check pre-burn | Verificación de saldo antes de quemar MEXCOIN | ✅ Implementado |
| Límites de transacción | $50K MXN por tx, $200K MXN diario (umbral UIF) | ✅ Implementado |
| Validación CLABE | Regex 18 dígitos antes de procesar retiro | ✅ Implementado |

### 4.2 Vulnerabilidades actuales (a corregir antes de producción)

| Vulnerabilidad | Riesgo | Solución |
|----------------|--------|----------|
| JWT sin verificar firma | Alto — cualquiera puede forjar un user_id | Usar `jose` o Firebase Auth para verificar |
| Firestore rules abiertas | Alto — cualquier usuario puede leer/escribir | Cerrar rules por collection |
| Private keys en .env.local | Medio — si el servidor es comprometido | Usar Railway Secrets o AWS Secrets Manager |
| Sin rate limiting en webhooks | Medio — DDoS o spam de eventos | Añadir middleware de rate limiting |
| Sin timeout en llamadas Celo | Medio — autorización puede exceder los 5s de Pomelo | Añadir timeout de 3s en llamadas RPC |
| Logs con datos sensibles | Bajo — user_id y CLABE parcial en console.log | Usar logger estructurado con redacción automática |
| Sin auditoría de contrato | Alto para mainnet — bugs en mint/burn | Auditoría formal antes de mover dinero real |

### 4.3 Seguridad operativa

| Proceso | Estado |
|---------|--------|
| Treasury wallet separada del deployer | ✅ Sí — roles diferenciados |
| Claves privadas en git | ✅ No — .env en .gitignore |
| COMPLIANCE_ADDRESS separado | ✅ Sí — puede pausar contratos independientemente |
| Rollback en withdrawal (burn falla) | ✅ Registra como pending, no quema si falla |
| Alerta cuando SPEI falla post-burn | 🔴 No — necesita PagerDuty/Slack |
| Multi-sig para treasury | 🔴 No — single key actualmente |
| Plan de respuesta a incidentes | 🔴 No documentado |

---

## 5. CONECTIVIDAD DE APIS POR PAÍS

### 5.1 México 🇲🇽

| Servicio | Proveedor | Función | Estado |
|----------|-----------|---------|--------|
| Tarjeta prepagada Mastercard | **Pomelo** | Emisión de tarjeta digital LEN, autorización en tiempo real | 🟡 Código listo, pendiente credenciales |
| Depósito/retiro SPEI | **Pomelo** (módulo digital accounts) | `BANK_TRANSFER_IN/OUT` via `/core/transactions/v1` | 🟡 Código listo, pendiente credenciales |
| KYC usuarios | **Pomelo** (`/identity/v2/sessions`) | Validación INE/CURP | 🔴 No implementado aún |
| Blockchain | **Celo Sepolia** → **Celo Mainnet** | MEXCOIN mint/burn/transfer | ✅ Testnet OK, mainnet pendiente |
| Base de datos | **Firebase Firestore** | Usuarios, transacciones, eventos | ✅ Activo |
| CNBV / regulatorio | Via Pomelo (tienen licencia IFPE) | No necesitamos licencia propia | 🟡 Confirmar con Pomelo |

**Alternativa SPEI si Pomelo no cubre:** STP (Sistema de Transferencias y Pagos) — API directa para CLABE en tiempo real. Tiene módulo para fintechs.

### 5.2 Guatemala 🇬🇹

| Servicio | Proveedor | Función | Estado |
|----------|-----------|---------|--------|
| Cuenta bancaria GTQ | **Banrural** | On/off ramp GTQ | 🔴 Contrato no firmado |
| Tarjeta prepagada | Por definir (Pomelo no opera en GT aún) | Emisión tarjeta | 🔴 Sin proveedor |
| KYC usuarios | Por definir | DPI guatemalteco | 🔴 Sin proveedor |
| Blockchain | Celo Sepolia → Mainnet | QUETZA mint/burn | ✅ Testnet OK |
| Regulatorio | Banguat (Banco de Guatemala) | Categoría "empresa de transferencias" | 🔴 Sin gestión |

**Notas GT:** Pomelo tiene presencia en Argentina, México, Colombia, Chile, Brasil — no Guatemala todavía. Necesitamos un BaaS local o acuerdo directo con Banrural.

### 5.3 Honduras 🇭🇳

| Servicio | Proveedor | Función | Estado |
|----------|-----------|---------|--------|
| Cuenta bancaria HNL | **BAC Honduras** | On/off ramp HNL | 🔴 Contrato no firmado |
| Tarjeta prepagada | Por definir | Emisión tarjeta | 🔴 Sin proveedor |
| KYC usuarios | Por definir | DNI hondureño | 🔴 Sin proveedor |
| Blockchain | Celo Sepolia → Mainnet | LEMPI mint/burn | ✅ Testnet OK |
| Regulatorio | CNBS (Comisión Bancaria HN) | Licencia remesas | 🔴 Sin gestión |

### 5.4 Infraestructura común

| Servicio | Proveedor | Función | Estado |
|----------|-----------|---------|--------|
| Deploy web | Railway | Auto-deploy en push | ✅ Activo |
| Blockchain testnet | Celo Sepolia (drpc.org) | RPC testnet | ✅ Activo |
| Blockchain mainnet | forno.celo.org | RPC producción | 🟡 Config lista, sin deploy |
| MCP Pomelo | api-reference-mcp.pomelo.la | Consulta de docs Pomelo en tiempo real | ✅ Conectado |
| Auth | Firebase Auth (planificado) | Auth real de usuarios | 🔴 Solo JWT mock actualmente |

### 5.5 Brechas de conectividad críticas

```
México:    Pomelo cubre el 80% — falta solo KYC y credenciales sandbox
Guatemala: 0% de conectividad real — sin BaaS, sin banco API, sin KYC
Honduras:  0% de conectividad real — sin BaaS, sin banco API, sin KYC
```

**Estrategia recomendada:** Lanzar SOLO México primero con Pomelo. Guatemala y Honduras en Fase 2 cuando haya revenue de MX para financiar el desarrollo.

---

## 6. PASOS A SEGUIR

### Sprint inmediato — Semana 1 (para tener sandbox funcionando)

| Paso | Acción | Duración estimada |
|------|--------|-------------------|
| 1 | Registrarse en developers.pomelo.la y obtener credenciales sandbox | 1 día |
| 2 | Llenar `.env.local` con `POMELO_CLIENT_ID`, `POMELO_CLIENT_SECRET`, etc. | 30 min |
| 3 | Crear usuario de prueba en Pomelo sandbox (POST /users/v1/) | 1 día |
| 4 | Implementar flujo KYC con INE/CURP de prueba (POST /identity/v2/sessions) | 2 días |
| 5 | Crear cuenta digital + emitir tarjeta de prueba en sandbox | 1 día |
| 6 | Probar pago simulado y verificar que llega a `/api/pomelo/authorize` | 1 día |
| 7 | Verificar que MEXCOIN se quema en Celo Sepolia al confirmar pago | 1 día |

**Total estimado:** 1 semana de desarrollo

### Sprint 2 — Semana 2-3 (seguridad y productivo)

| Paso | Acción |
|------|--------|
| 8 | Implementar JWT real con Firebase Auth (reemplazar decode sin verificar) |
| 9 | Cerrar Firestore security rules para usuarios reales |
| 10 | Implementar endpoint completo de onboarding `/api/users/register` (crea usuario + KYC + cuenta + tarjeta en Pomelo) |
| 11 | Deploy apps/admin en Railway |
| 12 | Configurar alertas (Slack webhook) para errores críticos (SPEI fallido post-burn) |
| 13 | Deploy MEXCOIN en Celo Mainnet (comprar ~0.3 CELO, ejecutar deploy:celo) |

### Sprint 3 — Semana 4 (primer usuario real)

| Paso | Acción |
|------|--------|
| 14 | Pasar de sandbox a producción en Pomelo (cambiar AUDIENCE y API_URL) |
| 15 | Primer usuario beta interno con tarjeta LEN física/digital |
| 16 | Monitorear flujo completo: depósito SPEI → MEXCOIN → pago tarjeta → burn |
| 17 | Ajustar basado en feedback |

### Roadmap de expansión (Fase 2 — Q3 2026)

```
Q2 2026:  México beta cerrado (10-50 usuarios)
Q3 2026:  Guatemala — negociar con Banrural + BaaS local
Q4 2026:  Honduras — negociar con BAC HN + BaaS local
Q1 2027:  FX cross-border automático MEXCOIN↔QUETZA↔LEMPI
Q2 2027:  Mobile app React Native con MiniPay
```

---

## APÉNDICE — ARCHIVOS CLAVE

```
apps/web/src/
├── lib/
│   ├── pomelo-client.ts    ← OAuth 2.0 + HMAC + API helpers
│   ├── celo-admin.ts       ← mint/burn/balance server-side
│   ├── minipay.ts          ← client-side Celo wallet
│   └── firebase.ts         ← Firestore connection
├── types/
│   └── pomelo.ts           ← tipos completos Pomelo API
└── app/api/
    ├── pomelo/authorize/   ← auth en tiempo real (crítico)
    ├── webhooks/pomelo/
    │   ├── transactions/   ← burn post-pago
    │   ├── adjustments/    ← reversals/cargos forzados
    │   └── deposit/        ← mint al depositar
    └── transfers/
        ├── send/           ← P2P MEXCOIN
        └── withdraw/       ← MEXCOIN → SPEI

blockchain/
├── contracts/MondegaCoin.sol
├── deployments/addresses.json   ← direcciones Celo Sepolia
└── hardhat.config.ts
```

---

*Documento generado: 2026-04-27 | Próxima revisión: al obtener credenciales Pomelo sandbox*
