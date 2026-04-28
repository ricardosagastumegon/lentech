# LEN — PLAN DE LANZAMIENTO MÉXICO
**Versión**: 1.0 | **Fecha**: 2026-04-15  
**Objetivo**: Usuarios reales en México con depósito SPEI, wallet MEXCOIN, y tarjeta virtual Mastercard

---

## ESTADO ACTUAL

| Componente | Estado | Bloqueante |
|---|---|---|
| Next.js (app web) | ✅ LIVE en Railway | — |
| Cuenca webhooks (SPEI) | ✅ LIVE | — |
| Celo Sepolia (testnet) | ✅ LIVE | — |
| Admin panel | ✅ BUILD OK | Verificar Railway deploy |
| auth-service | ⚠️ Código listo | Deploy pendiente |
| Celo Mainnet | ❌ No desplegado | $0.15 USD en CELO |
| Pomelo (tarjeta) | ❌ No integrado | Aprobación de cuenta |
| Twilio SMS OTP | ❌ No configurado | Credenciales |

**Tiempo estimado total**: 2–4 días de trabajo técnico + 5–15 días esperando aprobaciones de Pomelo

---

## FASE 0 — PRE-REQUISITOS (hacer hoy)

### 0.1 Abrir cuenta Pomelo
1. Ir a **https://pomelo.la/contacto**
2. Completar formulario business: nombre empresa, RFC/Número fiscal MX, modelo de negocio
3. Solicitar acceso al **sandbox** inmediatamente (no esperar cuenta producción)
4. Confirmar que Pomelo asigna:
   - `POMELO_CLIENT_ID`
   - `POMELO_CLIENT_SECRET`
   - BIN de tarjetas de prueba

> **Por qué primero**: Pomelo tarda 5–15 días hábiles en aprobar cuentas. Iniciar hoy.

### 0.2 Obtener credenciales Twilio
1. Ir a **https://console.twilio.com** → Create Account (gratis)
2. Activar **Verify API** (para SMS OTP)
3. Guardar:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VERIFY_SERVICE_SID`
4. Verificar número de teléfono tuyo para pruebas (sandbox requiere esto)

> **Costo**: ~$0.05 USD por SMS verificación en producción. Trial gratuito incluye crédito inicial.

### 0.3 Obtener CELO para mainnet
1. Comprar o transferir **0.5 CELO** (≈ $0.20 USD) a la admin wallet
2. La wallet admin está en: `ADMIN_PRIVATE_KEY` (variable de entorno en Next.js)
3. Verificar dirección en **https://explorer.celo.org**

> **Por qué 0.5 y no 0.15**: 0.15 para deploy de contratos + 0.35 de reserva para gas en operaciones iniciales

---

## FASE 1 — CELO MAINNET (día 1)

### 1.1 Verificar contratos actuales (Sepolia)
```bash
cd apps/web
cat .env.local | grep CELO
# Verificar: NEXT_PUBLIC_MEXCOIN_ADDRESS, CELO_ADMIN_ADDRESS
```

### 1.2 Deploy MEXCOIN a Celo Mainnet
```bash
cd packages/contracts  # o donde estén los contratos Hardhat/Foundry

# Si usa Hardhat:
npx hardhat run scripts/deploy.ts --network celo

# Si usa Foundry:
forge script script/Deploy.s.sol --rpc-url https://forno.celo.org --broadcast
```

**Variables necesarias en `.env`**:
```env
CELO_RPC_URL=https://forno.celo.org
ADMIN_PRIVATE_KEY=0x...  # wallet con 0.5 CELO
```

**Guardar output del deploy**:
```
MEXCOIN deployed to: 0xABC...123
Block: 12345678
Gas used: 1,234,567
```

### 1.3 Actualizar variables en Railway — Next.js
En Railway → app `web` → Variables:
```
NEXT_PUBLIC_MEXCOIN_ADDRESS=0xABC...123  (mainnet)
NEXT_PUBLIC_CELO_CHAIN_ID=42220          (mainnet, era 44787 Sepolia)
CELO_RPC_URL=https://forno.celo.org
```

> **CRÍTICO**: El webhook de Cuenca (deposit) llama a `mintMexcoin()` — si `NEXT_PUBLIC_MEXCOIN_ADDRESS` sigue apuntando a Sepolia, los depósitos reales no mintearán nada en mainnet.

### 1.4 Verificar contrato en Celoscan
1. Ir a **https://celoscan.io/address/0xABC...123**
2. Confirmar que el contrato está ahí
3. Verificar el código fuente (opcional pero recomendado para confianza institucional):
   ```bash
   npx hardhat verify --network celo 0xABC...123
   ```

---

## FASE 2 — AUTH-SERVICE EN RAILWAY (día 1–2)

### 2.1 Verificar que el código compila
```bash
cd services/auth-service
pnpm install
pnpm build
# Debe terminar sin errores
```

### 2.2 Crear base de datos PostgreSQL en Railway
1. Railway dashboard → **New** → **Database** → **PostgreSQL**
2. Copiar `DATABASE_URL` del panel de conexión
3. Correr las migraciones:
   ```bash
   cd services/auth-service
   DATABASE_URL=postgresql://... pnpm migration:run
   # Si no hay migraciones aún:
   pnpm typeorm schema:sync  # solo en desarrollo inicial
   ```

### 2.3 Crear servicio auth-service en Railway
1. Railway → **New Service** → **GitHub Repo**
2. Seleccionar repo MONDEGA
3. Configurar **Root Directory**: `services/auth-service`
4. **Build Command**: `pnpm install && pnpm build`
5. **Start Command**: `node dist/main.js`

### 2.4 Configurar variables de entorno en Railway
```env
NODE_ENV=production
PORT=3001

# PostgreSQL (copiar de Railway DB)
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=<64 bytes hex aleatorio>
JWT_ISSUER=mondega.io
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=<64 char hex aleatorio>

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxx

# Firebase (si auth-service usa Firestore para sesiones)
FIREBASE_PROJECT_ID=len-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@len-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

# Internal
INTERNAL_API_SECRET=<secreto compartido con otros servicios>
```

> **Generar secretos seguros**:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 2.5 Verificar health check
```bash
curl https://auth-service-xxxxx.railway.app/health
# Debe responder: {"status":"ok","service":"auth-service"}
```

### 2.6 Conectar Next.js con auth-service
En Railway → app `web` → Variables:
```
AUTH_SERVICE_URL=https://auth-service-xxxxx.railway.app
INTERNAL_API_SECRET=<mismo valor que auth-service>
```

---

## FASE 3 — VERIFICACIÓN CUENCA + CELO (día 2)

### 3.1 Test depósito SPEI en staging
Cuenca ofrece un ambiente de pruebas. Verificar con el equipo de Cuenca:
1. Solicitar credenciales de sandbox si no las tienen
2. Simular un SPEI entrante desde el dashboard de Cuenca
3. Verificar que el webhook llega a: `https://len-web.railway.app/api/webhooks/cuenca/deposit`
4. Confirmar en los logs de Railway que:
   ```
   [deposit] ✓ 100.00 MEXCOIN minteado para user_xyz | tx: 0xabc...
   ```
5. Verificar en Celoscan que la transacción existe

### 3.2 Test pago con tarjeta (cuando Cuenca sandbox lo permita)
1. Usar tarjeta de prueba de Cuenca
2. Verificar webhook en: `/api/webhooks/cuenca/card-payment`
3. Confirmar que MEXCOIN se quema correctamente

### 3.3 Checklist de seguridad webhooks
- [ ] `CUENCA_WEBHOOK_SECRET` configurado en Railway
- [ ] Signature verification activa (no comentada en código)
- [ ] Idempotencia funciona: enviar mismo evento 2 veces → segunda vez retorna `already_processed: true`

---

## FASE 4 — POMELO TARJETA VIRTUAL (día 3–5, después de aprobación)

> Esta fase requiere que Pomelo haya aprobado la cuenta (5–15 días).

### 4.1 Configurar card-service en Railway
Repetir proceso similar a auth-service:
1. Railway → New Service → GitHub Repo
2. Root Directory: `services/card-service`
3. Build: `pnpm install && pnpm build`
4. Start: `node dist/main.js`

### 4.2 Variables de entorno card-service
```env
NODE_ENV=production
PORT=3007

# PostgreSQL (puede compartir DB de auth o tener propia)
DATABASE_URL=postgresql://...

# JWT (mismo secreto que auth-service para validar tokens)
JWT_SECRET=<mismo JWT_SECRET que auth-service>
JWT_ISSUER=mondega.io

# Pomelo
POMELO_API_URL=https://api.pomelo.la      # producción
POMELO_CLIENT_ID=<de Pomelo dashboard>
POMELO_CLIENT_SECRET=<de Pomelo dashboard>
POMELO_AUDIENCE=https://api.pomelo.la

# Internal
INTERNAL_API_SECRET=<mismo que otros servicios>
```

### 4.3 Configurar webhook de autorización Pomelo
En el dashboard de Pomelo:
1. Ir a **Webhooks** → **Authorization**
2. Configurar URL: `https://card-service-xxxxx.railway.app/webhooks/pomelo/authorization`
3. Copiar el secreto de firma que genera Pomelo
4. Agregar variable: `POMELO_WEBHOOK_SECRET=<secreto>`

### 4.4 Registrar card-service en Next.js
```env
CARD_SERVICE_URL=https://card-service-xxxxx.railway.app
```

### 4.5 Test tarjeta virtual
```bash
# 1. Login para obtener JWT
curl -X POST https://auth-service-xxxxx.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@len.mx","password":"TestPass123!"}'

# Guardar: access_token

# 2. Emitir tarjeta virtual
curl -X POST https://card-service-xxxxx.railway.app/cards \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "virtual",
    "currency": "MXN",
    "spendingLimitDaily": 5000
  }'

# Respuesta esperada:
# { "ok": true, "data": { "cardId": "xxx", "last4": "1234", "status": "active" } }
```

---

## FASE 5 — LANZAMIENTO SOFT (día 4–7)

### 5.1 Onboarding de primeros usuarios (beta cerrada)
- Invitar manualmente 10–20 usuarios conocidos
- Cada usuario debe:
  1. Registrarse en la app
  2. Verificar número de teléfono (Twilio SMS)
  3. Hacer primer depósito SPEI (mínimo $100 MXN)
  4. Ver balance MEXCOIN en app
  5. (Si Pomelo aprobado) Solicitar tarjeta virtual

### 5.2 Monitoreo Railway — configurar alertas
En Railway para cada servicio:
1. **Metrics** → verificar CPU y memoria normal
2. **Logs** → buscar errores con filtro: `ERROR` o `[error]`
3. Configurar alerta de email si servicio cae

### 5.3 Monitoreo Celo
Crear alerta en Celoscan para la wallet admin:
1. **https://celoscan.io/myapikey** → crear API key
2. Monitorear si el balance de CELO cae por debajo de 0.1 (recarga de gas)

### 5.4 Documentos legales MX — URGENTE
Antes de usuarios reales, publicar en la app:
- [ ] **Aviso de Privacidad** (LFPDPPP obligatorio en México)
  - Mínimo: nombre empresa, datos que recopilan, finalidad, derechos ARCO
  - Plantilla en: https://www.inai.org.mx
- [ ] **Términos y Condiciones**
  - Mencionar: "LEN es una plataforma tecnológica. Servicios bancarios provistos por Cuenca (IFPE con licencia CNBV). Tarjetas provistos por Pomelo bajo licencia Mastercard."
- [ ] **Política de AML/CFT** (interna — para auditorías)

> **Sin Aviso de Privacidad publicado, el INAI puede multar hasta $1.9M MXN.**

---

## FASE 6 — GNOSIS SAFE (post-lanzamiento, semana 2)

### Por qué es crítico
Actualmente: `ADMIN_PRIVATE_KEY` en Railway env var controla TODO el dinero de usuarios.  
Si alguien accede a Railway → game over.

### Implementación
1. Crear Gnosis Safe en Celo:
   - https://safe.global → Connect Wallet → Celo network
   - Minimum 2-of-3 multisig (tú + co-founder + hardware wallet)
2. Transferir rol `MINTER_ROLE` y `BURNER_ROLE` al Safe
3. Actualizar el contrato:
   ```solidity
   token.grantRole(MINTER_ROLE, safeAddress);
   token.revokeRole(MINTER_ROLE, oldAdminAddress);
   ```
4. Para operaciones automáticas (webhooks): usar un "operator" separado con límite diario

---

## CHECKLIST FINAL ANTES DE ABRIR AL PÚBLICO

### Infraestructura
- [ ] auth-service desplegado y respondiendo `/health`
- [ ] MEXCOIN en Celo Mainnet — dirección guardada
- [ ] Variables de entorno actualizadas (mainnet, no testnet)
- [ ] Cuenca webhooks verificados con firma real
- [ ] Railway alertas configuradas

### Seguridad
- [ ] `CUENCA_WEBHOOK_SECRET` rotado (usar nuevo valor, no el de dev)
- [ ] JWT_SECRET único y de 64+ bytes
- [ ] ENCRYPTION_KEY único
- [ ] Ningún secreto en código (git grep "sk_live" debe dar vacío)

### Legal
- [ ] Aviso de Privacidad publicado en app
- [ ] Términos y Condiciones publicados
- [ ] Screenshots guardados (evidencia de cumplimiento)

### Pruebas
- [ ] Depósito SPEI de extremo a extremo funciona
- [ ] Balance MEXCOIN se actualiza en tiempo real
- [ ] Reversal de pago funciona (si aplica)
- [ ] Login/logout funciona
- [ ] Registro con verificación SMS funciona

### Monitoreo
- [ ] Logs de Railway accesibles
- [ ] Saldo CELO admin wallet > 0.3
- [ ] Alerta si algún servicio cae

---

## COSTOS OPERATIVOS MX — PRIMER MES

| Concepto | Costo estimado |
|---|---|
| Railway (3 servicios + 1 DB) | $15–25 USD/mes |
| Celo gas (operaciones) | $2–5 USD/mes |
| Twilio SMS (100 usuarios) | $5–10 USD/mes |
| Pomelo (por transacción) | ~1.5–2.5% por uso de tarjeta |
| Cuenca (por transferencia) | $5–8 MXN por SPEI saliente |
| **Total fijo** | **~$20–40 USD/mes** |

> **Modelo de negocio**: A partir del spread FX y/o fee de tarjeta, el costo variable de Pomelo se cubre con el margen.

---

## SECUENCIA DE COMANDOS — DÍA 1

```bash
# 1. Verificar que todo compila
cd /c/Users/PC/OneDrive/LEN/MONDEGA
pnpm install
pnpm build --filter=@mondega/auth-service
pnpm build --filter=@mondega/web

# 2. Deploy contratos Celo Mainnet (desde directorio de contratos)
# Asegurarse de tener CELO en la wallet admin
cd packages/contracts
npx hardhat run scripts/deploy.ts --network celo

# 3. Guardar dirección del contrato, actualizar .env.production
# NEXT_PUBLIC_MEXCOIN_ADDRESS=0xNEWADDRESS

# 4. Push a git → Railway auto-deploy
git add -A
git commit -m "chore: update MEXCOIN address to Celo mainnet"
git push origin main

# 5. Verificar en Railway que los 3 deploys (web, admin, auth) pasan
# 6. Test manual del flujo de depósito
```

---

*Documento generado: 2026-04-15*  
*Próxima revisión: después de cada fase completada*
