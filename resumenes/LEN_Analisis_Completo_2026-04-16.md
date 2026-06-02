# LEN — ANÁLISIS TÉCNICO COMPLETO
**Fecha:** 2026-04-16 | **Repo:** github.com/ricardosagastumegon/lentech  
**App LIVE:** https://web-production-1c372.up.railway.app  
**Preparado para:** Due diligence institucional / seed raise / alianzas bancarias

---

## CONTEXTO — MODELO DE NEGOCIO

LEN es una red de monedas digitales 1:1 para el corredor de comercio informal México–Guatemala–Honduras.

**Modelo tecnológico (no requiere licencia propia):**
```
Usuario → LEN (tecnología) → Cuenca (IFPE licenciada MX) → SPEI / Banxico
                           → Pomelo (Mastercard licenciado LATAM) → Red Mastercard
                           → Celo Blockchain (MEXCOIN 1:1 MXN)
```

LEN opera como **capa tecnológica sobre terceros regulados**. Cuenca tiene licencia IFPE del CNBV. Pomelo tiene autorización Mastercard en LATAM. LEN no capta fondos ni emite instrumentos de pago propios — conecta, convierte y registra en blockchain.

---

## ARQUITECTURA REAL (LO QUE EXISTE HOY)

```
┌─────────────────────────────────────────────────────────────────┐
│  apps/web (Next.js 14) — LIVE en Railway                        │
│                                                                  │
│  /dashboard, /send, /receive, /card, /kyc, /add-money           │
│  /minipay (Celo MiniPay integration)                            │
│  /pitch (15 slides investor deck + export PDF)                  │
│                                                                  │
│  API Routes:                                                     │
│    POST /api/webhooks/cuenca/deposit    ← SPEI recibido → mint  │
│    POST /api/webhooks/cuenca/card-payment ← pago tarjeta → burn │
│    POST /api/transfers/send                                      │
│    POST /api/transfers/withdraw                                  │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ├── Firestore (demo DB — 3 usuarios fijos)
              ├── Celo Sepolia (contratos deployados ✅)
              └── Cuenca API (SPEI — LIVE ✅)

┌─────────────────────────────────────────────────────────────────┐
│  Microservicios NestJS (Railway — no deployados aún)            │
│                                                                  │
│  auth-service:3001    ✅ COMPLETO (listo para deploy)           │
│  card-service:3007    ✅ COMPLETO (Pomelo — sandbox)            │
│  fiat-bridge:3006     ✅ COMPLETO (Banrural/STP — GT/HN futuro)│
│  fx-engine:3003       ✅ COMPLETO (3 proveedores FX)            │
│  wallet-service:3002  ⚠️  SIN HTTP (falta controller/main.ts)  │
│  compliance:3004      ⚠️  SIN HTTP (AML rules escritas)        │
│  notification:3005    ⚠️  SIN HTTP (Bull processors escritos)  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Smart Contracts (Solidity / OpenZeppelin v5)                   │
│                                                                  │
│  MondegaCoin.sol — ERC-20 con roles separados                   │
│  MondegaFactory.sol — Deploy y registro de coins                │
│                                                                  │
│  CELO SEPOLIA (testnet) ✅ DEPLOYADO                            │
│    MEXCOIN: 0xAa0fF59Bbe62373D0954801abb51331d323f41A9          │
│    QUETZA:  0xba45b516C4fC485231863681B5ECc4E385105a13          │
│    LEMPI:   0x7d120f4e63937e944Fa5b1Ad97D38aC1C16D2e1A          │
│                                                                  │
│  CELO MAINNET ❌ PENDIENTE ($0.15 USD en CELO = deploy listo)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. SEGURIDAD

### Implementado y correcto ✅

| Área | Implementación |
|------|---------------|
| Hash de PIN | Argon2id — memoryCost 64MB, 3 iterations, 4 threads (OWASP top tier) |
| JWT | Access token 15min + Refresh 7d + rotación en cada refresh |
| 2FA | TOTP (speakeasy), secreto cifrado con AES-256-GCM antes de guardarse |
| Cifrado PII | AES-256-GCM con IV random por operación + authTag (authenticated encryption) |
| Webhook signature | HMAC-SHA256 + `timingSafeEqual` (previene timing attacks) |
| Idempotencia webhooks | Event IDs guardados en Firestore — re-entregas no re-procesan |
| Smart contract | OpenZeppelin v5: AccessControl, ERC20Pausable, ReentrancyGuard |
| Blacklist AML | On-chain en `_update()` — bloqueado a nivel de token, no se puede evadir |
| Rate limiting | Por endpoint: 5 reg/hr, 10 OTP/hr, 10 login/15min |
| Session lockout | 5 intentos fallidos → 30 min bloqueo automático |
| User enumeration | Respuestas idénticas en register/reset — no revela si el usuario existe |
| Input validation | class-validator: whitelist + forbidNonWhitelisted en todos los DTOs |
| Webhook auth | `X-Cuenca-Signature` verificada antes de cualquier procesamiento |
| Balance check | Saldo verificado on-chain antes de quemar MEXCOIN (card-payment) |

### Riesgos a resolver antes de mainnet

| Riesgo | Nivel | Solución |
|--------|:-----:|---------|
| Private key en env var (`DEPLOYER_PRIVATE_KEY`) | 🔴 ALTO | Migrar a Gnosis Safe multisig o AWS KMS. En testnet OK. |
| Sin límite máximo por mint | 🟠 MEDIO | Agregar `MAX_MINT_PER_TX = 50,000 MXN` en webhook de depósito |
| Rate limiting por instancia (no distribuido) | 🟠 MEDIO | Cambiar a Redis-backed rate limiting antes de escalar |
| Comunicación inter-servicios con secret plano | 🟡 BAJO | Producción: mTLS o JWT firmados inter-servicios |
| Sin API Gateway | 🟡 BAJO | nginx o Kong frente a microservicios en producción |
| Sin CSP headers en Next.js | 🟡 BAJO | Agregar Content-Security-Policy en `next.config.js` |

**Calificación: 7.5/10** — Sólida para staging/demo. 2 cambios críticos antes de mainnet con fondos reales.

---

## 2. CONECTIVIDAD

### Stack de conexiones activo

```
[Usuario] → Next.js (Railway)
              ├── Firestore ←→ balance/txs en tiempo real (onSnapshot)
              ├── Celo Sepolia ←→ mint/burn MEXCOIN (viem)
              ├── Cuenca API ←→ SPEI depósitos/retiros (LIVE ✅)
              └── MiniPay ←→ detección wallet Celo en Opera Mini
```

### Proveedores por estado

| Proveedor | Función | Estado | Acción necesaria |
|-----------|---------|:------:|-----------------|
| **Cuenca** | SPEI (MX) depósitos y retiros | ✅ LIVE | Solo credenciales producción |
| Celo Sepolia | Blockchain testnet | ✅ LIVE | — |
| **Celo Mainnet** | Blockchain producción | ❌ | Deploy contratos ($0.15 CELO) |
| **Pomelo** | Mastercard virtual (LATAM) | ⚠️ Código listo | Aprobar cuenta business en Pomelo |
| Twilio | SMS OTP | ⚠️ Código listo | Credenciales + número |
| SendGrid | Email | ⚠️ Código listo | Credenciales + dominio verificado |
| WhatsApp Business | OTP/notificaciones | ⚠️ Código listo | Meta Business account |
| OpenExchangeRates | FX rates primario | ⚠️ Código listo | API key (gratis) |
| Fixer.io | FX rates secundario | ⚠️ Código listo | API key (gratis) |
| Jumio | KYC/identidad | ⚠️ Config solo | Contrato Jumio |
| Chainalysis | OFAC/Sanctions screening | ⚠️ Código listo | API key |
| Banrural GT | SPEI análogo Guatemala | ⚠️ Código listo | Contrato bancario (futuro) |
| BAC Credomatic HN | Honduras | ⚠️ Código listo | Contrato bancario (futuro) |

### Arquitectura de proveedores — MX vs GT/HN

```
MÉXICO (activo via Cuenca):
  Next.js → Cuenca API → SPEI/Banxico → Usuario MX
  
GUATEMALA/HONDURAS (futuro via NestJS fiat-bridge):
  Next.js → fiat-bridge NestJS → Banrural API → Usuario GT
                               → BAC API → Usuario HN
```
**No son duplicados** — son capas para diferentes países y fases.

**Calificación: 5.5/10** — Arquitectura correcta, conectividad real parcial. MX tiene la base funcional.

---

## 3. PROGRAMACIÓN

### Calidad del código

| Aspecto | Estado |
|---------|--------|
| Lenguaje | TypeScript 5.7 strict mode en toda la pila |
| Arquitectura | Microservicios + monorepo (pnpm workspaces + Turborepo) |
| NestJS patterns | DI, Guards, Pipes, DTOs, decorators — uso correcto |
| Separación | Controller → Service → Repository — limpia |
| Tipos compartidos | `@mondega/shared-types` y `shared-utils` bien definidos |
| BigInt math | `safeSub/safeAdd` previenen underflow/overflow |
| Idempotencia | Implementada en webhooks con event IDs |
| Smart contracts | OZ v5, non-reentrant, events, roles — nivel producción |
| Errores HTTP | NestJS exceptions estandarizadas |
| CORS | Configurado por servicio con origins explícitos |

### Servicios completos vs incompletos

| Servicio | Controller | Module | Main.ts | Estado |
|---------|:----------:|:------:|:-------:|--------|
| auth-service | ✅ | ✅ | ✅ | **Listo para deploy** |
| card-service | ✅ | ✅ | ✅ | **Listo para deploy** |
| fiat-bridge | ✅ | ✅ | ✅ | **Listo para deploy** |
| fx-engine | ✅ | ✅ | ✅ | **Listo para deploy** |
| wallet-service | ❌ | ❌ | ❌ | **Incompleto — falta HTTP layer** |
| compliance | ❌ | ❌ | ❌ | **Incompleto — falta HTTP layer** |
| notification | ❌ | ❌ | ❌ | **Incompleto — solo Bull processors** |

### Deuda técnica

| Ítem | Impacto |
|------|---------|
| 0 tests escritos (jest configurado sin specs) | Alto — cualquier cambio puede romper silenciosamente |
| wallet-service sin HTTP layer | Bloquea balances y transferencias reales |
| Sin `/health` endpoints | Railway no puede hacer health checks |
| Sin structured logging (JSON + correlation IDs) | Debugging en producción muy difícil |
| Sin OpenAPI/Swagger en todos los servicios | Dificulta integración de terceros |
| `compliance/screening` y `compliance/reports` son placeholders | Funcionalidad crítica sin implementar |

**Calificación: 7/10** — Arquitectura profesional, cero tests, 3 servicios incompletos.

---

## 4. USUARIO / UX

### Lo que funciona HOY para un usuario real

| Función | Estado | Notas |
|---------|:------:|-------|
| Ver app en vivo | ✅ | web-production-1c372.up.railway.app |
| Pitch deck interactivo | ✅ | /pitch — 15 slides + export PDF |
| Dashboard con balance | ✅ | Firestore real-time (solo demo users) |
| Enviar P2P entre demo users | ✅ | demo-gt, demo-mx, demo-hn |
| Historial de transacciones | ✅ | Funcional |
| FX rates en tiempo real | ✅ | Fallback hardcoded si oracle falla |
| KYC flow | ✅ | UI completa (sin backend real) |
| MiniPay (Celo testnet) | ✅ | Funcional con Celo Sepolia |
| Registro real | ❌ | "Próximamente" — auth-service no deployado |
| Login real | ❌ | Solo 3 usuarios demo hardcodeados |
| Tarjeta virtual | ❌ | UI existe — Pomelo no conectado |
| Agregar dinero real | ❌ | Cuenca conectado — sin usuarios reales aún |
| Admin panel | ❌ | Buildeado, no deployado en Railway |

### Problemas UX a resolver para lanzamiento

| Problema | Prioridad |
|---------|:---------:|
| Sin onboarding para usuario nuevo (tour/walkthrough) | Alta |
| Sin mensaje de "cuánto tarda" al enviar SPEI | Alta |
| Sin estado de carga mientras blockchain confirma tx | Alta |
| Sin feedback claro si balance insuficiente antes de iniciar pago | Alta |
| Sin deep link para MiniPay en móvil | Media |
| Registro dice "próximamente" — cambiar cuando auth-service se deploye | Alta |

**Calificación: 6/10** — Demo muy convincente para inversores. No apto para usuarios reales hasta completar auth-service.

---

## 5. CONFIANZA

### Para inversores (seed / VC)

| Indicador | Estado |
|-----------|:------:|
| App LIVE con URL pública demostrable | ✅ |
| Smart contracts auditables en Blockscout | ✅ (testnet) |
| Código organizado en monorepo profesional | ✅ |
| Pitch deck integrado exportable PDF | ✅ |
| AML/Compliance documentado con reglas FATF | ✅ |
| Arquitectura financiera de clase mundial (microservicios) | ✅ |
| Contratos en mainnet con transacciones reales | ❌ |
| Usuarios reales (MAUs) para Celo Builders Fund | ❌ |
| Auditoría de seguridad externa (CertiK/Trail of Bits) | ❌ |
| Balance en testnet con primeras transacciones reales | ❌ |

### Para aliados institucionales (bancos, gobiernos)

| Indicador | Estado |
|-----------|:------:|
| Multi-sig en treasury (Gnosis Safe) | ❌ Necesario |
| Auditoría de smart contract | ❌ Requerida por cualquier banco |
| SLA documentado (uptime, latencia, recovery) | ❌ |
| Política de privacidad y términos de uso | ❌ |
| Penetration testing report | ❌ |
| ISO 27001 o SOC 2 (largo plazo) | ❌ |

### Modelo de confianza técnica

```
Usuario confía en LEN
LEN confía en Cuenca (IFPE — regulada CNBV MX)
Cuenca confía en Banxico (SPEI)
LEN confía en Pomelo (autorización Mastercard LATAM)
LEN confía en Celo (blockchain público, auditable)
```
El modelo es correcto: LEN no necesita la confianza de un banco — la hereda de sus proveedores regulados.

**Calificación: 6.5/10** — Muy fuerte para seed pitch. Para institucional: necesita auditoría + multi-sig.

---

## 6. LEGAL Y BANCARIO

### Modelo sin licencia propia — CORRECTO

**LEN opera como capa tecnológica (fintech enabler), NO como institución financiera.**

| Proveedor | Licencia que aporta | País |
|-----------|-------------------|------|
| **Cuenca** | IFPE (CNBV) — puede emitir e-money, operar SPEI | México |
| **Pomelo** | Habilitador Mastercard para LATAM — BIN sponsor | MX, AR, CO, CL, BR |
| **Celo Foundation** | Blockchain pública — no requiere licencia para usar | Global |
| Banrural (futuro) | Banco autorizado SIB | Guatemala |
| BAC Credomatic (futuro) | Banco autorizado CNBS | Honduras |

**Cuenca es el punto clave:** al usar Cuenca como proveedor de SPEI, LEN hereda el marco regulatorio de Cuenca. LEN no capta fondos — Cuenca sí, bajo su licencia.

### Cumplimiento AML/CFT implementado

| Requerimiento FATF | Estado |
|-------------------|:------:|
| KYC por niveles (Anonymous/Basic/Verified/Business) | ✅ Código implementado |
| Límites por nivel KYC ($50/$200/$2,000/$100,000 por tx) | ✅ Implementado |
| Reporte automático operaciones ≥$1,000 USD | ✅ Implementado |
| Detección de estructuración (múltiples txs bajo threshold) | ✅ Implementado |
| Límite diario $2,000 / mensual $10,000 | ✅ Implementado |
| Screening OFAC/ONU/UE via Chainalysis | ✅ Código listo (pendiente API key) |
| Bloqueo países alto riesgo (VE, CU, IR, KP, SY, RU, BY) | ✅ Implementado |
| Velocity check (max 10 tx en 5 min) | ✅ Implementado |
| Blacklist on-chain en smart contract | ✅ Implementado |
| STR (Suspicious Transaction Report) canal real | ⚠️ Flag en código, sin canal real de reporte aún |

### Marco de protección de datos

| Requerimiento | Aplicación | Estado |
|--------------|-----------|:------:|
| Cifrado de PII en reposo | AES-256-GCM implementado | ✅ |
| PAN tarjeta nunca almacenado | Pomelo retiene el PAN | ✅ |
| Política de privacidad | México: Ley Federal de Protección de Datos | ❌ Pendiente redactar |
| Términos de uso | — | ❌ Pendiente |
| Aviso de Privacidad (MX) | Obligatorio por LFPDPPP | ❌ Pendiente |

### Riesgos legales actuales

| Riesgo | Nivel | Mitigación |
|--------|:-----:|-----------|
| Operar sin Aviso de Privacidad (MX) | 🟠 MEDIO | Redactar y publicar antes de usuarios reales |
| Treasury key centralizada | 🟠 MEDIO | Gnosis Safe multisig (2-of-3) |
| Sin términos de uso claros | 🟡 BAJO | Redactar antes de lanzamiento |
| STR sin canal de reporte | 🟡 BAJO | Definir proceso manual inicial, luego automatizar |

**Calificación: 7.5/10** — El modelo de "capa tecnológica sobre terceros licenciados" es sólido y usado por Airwallex, Mercury, Brex. Cuenca ya tiene lo que necesitas regulatoriamente para MX.

---

## RESUMEN EJECUTIVO

| Dimensión | Calificación | Status |
|-----------|:-----------:|--------|
| **Seguridad** | **7.5/10** | Sólida para staging. 2 cambios para mainnet con dinero real |
| **Conectividad** | **5.5/10** | Arquitectura correcta. MX base funcional, GT/HN futuro |
| **Programación** | **7/10** | Código profesional. 3 servicios incompletos. 0 tests |
| **Usuario/UX** | **6/10** | Demo convincente. No apto usuarios reales sin auth real |
| **Confianza** | **6.5/10** | Fuerte para seed. Auditoría externa para institucional |
| **Legal/Bancario** | **7.5/10** | Modelo correcto — sin licencia propia, operando sobre Cuenca/Pomelo |
| **PROMEDIO** | **6.7/10** | **Listo para demo institucional. 60-90 días para MX real** |

---

## PASOS CRÍTICOS — LANZAMIENTO SOLO MÉXICO

*(Ver sección siguiente para el plan detallado)*

### Stack mínimo para MX live con usuarios reales

```
Cuenca (SPEI) ✅ LIVE
    ↓
Next.js (app) ✅ LIVE
    ↓
auth-service (registro/login real) → DEPLOY PENDIENTE
    ↓
Celo Mainnet (contratos) → $0.15 USD
    ↓
Twilio (SMS OTP) → credenciales
    ↓
Pomelo (tarjeta virtual) → aprobación account
```

---

*Documento generado: 2026-04-16*  
*Próxima revisión: después del lanzamiento MX*
