# LEN — Estado Completo del Proyecto
**Fecha:** 2026-04-16  
**Repo:** github.com/ricardosagastumegon/lentech  
**App LIVE:** https://web-production-1c372.up.railway.app

---

## RESUMEN EJECUTIVO

LEN es una red de monedas digitales 1:1 para el corredor de comercio informal México–Guatemala–Honduras. Tokens: MEXCOIN (MXN), QUETZA (GTQ), LEMPI (HNL).

**Estado hoy:** Demo funcional LIVE + contratos deployados en Celo testnet + integración MiniPay completa. Buscando $500K–$1M seed.

---

## 1. QUÉ ESTÁ HECHO Y FUNCIONANDO

### App Web (LIVE en Railway)
| Pantalla | Estado |
|----------|--------|
| Landing `/` | ✅ LIVE |
| Login `/login` | ✅ Demo con 3 wallets fijas |
| Dashboard `/dashboard` | ✅ Balance + transacciones en tiempo real |
| Enviar `/send` | ✅ P2P cross-country con FX real |
| Recibir `/receive` | ✅ QR + address |
| Transacciones `/transactions` | ✅ Historial |
| KYC `/kyc` | ✅ Flujo de verificación |
| Agregar dinero `/add-money` | ✅ |
| Comprar tokens `/buy-tokens` | ✅ |
| Vender tokens `/sell-tokens` | ✅ |
| Pitch deck `/pitch` | ✅ 15 slides bilingüe + export PDF |
| **MiniPay `/minipay`** | ✅ **NUEVO — integración Celo** |
| Registro `/register` | ✅ "Próximamente" (backend pendiente) |

### Admin Panel (buildeado, sin deploy)
- 21 bancos reales (Banrural GT, BAC HN, STP MX, etc.)
- KYC/AML queue
- Parámetros FX en tiempo real
- Sync con Firestore
- **Pendiente:** deploy en Railway como servicio separado

### Blockchain — Contratos LIVE en Celo Sepolia
**Red:** Celo Sepolia Testnet | **ChainId:** 11142220  
**Deployado:** 2026-04-16 | **Deployer:** `0x792E9F32b5EF9CF0Dcc5E66EaEB01A12E1bbbED9`

| Contrato | Address |
|----------|---------|
| MondegaFactory | `0x02Ec604E61c65E31618B74E47F7C861928C5AaEB` |
| **MEXCOIN** (MXN) | `0xAa0fF59Bbe62373D0954801abb51331d323f41A9` |
| QUETZA (GTQ) | `0xba45b516C4fC485231863681B5ECc4E385105a13` |
| LEMPI (HNL) | `0x7d120f4e63937e944Fa5b1Ad97D38aC1C16D2e1A` |
| COLON (SVC) | `0x546718C3565C417ddc0346a070B7f78325Fc8E78` |
| NICORD (NIO) | `0x19de414D35820286ff5b274c7832dc653acaC76E` |
| TIKAL (BZD) | `0xF1C588c10Ad6892267d0e49E24F58169F33deb9D` |
| CORI (CRC) | `0xAcE18a308C51134ce752A9E2a179369b163b9e22` |
| DOLAR (USD) | `0x3b74B9f0d7c86A7e9BD4909cBBE4cDbE6F7276e8` |

**Explorador:** https://celo-sepolia.blockscout.com/address/0xAa0fF59Bbe62373D0954801abb51331d323f41A9

### Integración MiniPay
- `apps/web/src/lib/minipay.ts` — detecta `window.ethereum.isMiniPay`, lee balance MEXCOIN, ejecuta transfers con viem
- `apps/web/src/app/minipay/page.tsx` — ruta `/minipay` con 6 pantallas:
  - `no-wallet` → instrucciones de descarga MiniPay
  - `connect` → botón conectar wallet
  - `wrong-network` → instrucciones de red
  - `dashboard` → balance MEXCOIN + botón Enviar
  - `send` → formulario envío con validación
  - `success` → confirmación con hash en Celo explorer

### CI/CD
- GitHub Actions: solo typecheck + build (web + admin). Sin referencias a servicios inexistentes.
- Railway auto-deploy en push a main (apps/web)
- Firestore security rules: solo permite demo-gt, demo-mx, demo-hn

---

## 2. STACK TÉCNICO

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Web frontend | Next.js 14, TypeScript strict | LIVE |
| Admin panel | Next.js 14, TypeScript strict | Built, sin deploy |
| Mobile | React Native / Expo | WIP |
| Smart contracts | Solidity 0.8.24, Hardhat, OpenZeppelin v5 | **Deployed Celo Sepolia** |
| Blockchain | Celo Sepolia (testnet) / Celo Mainnet (futuro) | Testnet LIVE |
| Wallet lib | viem v2 + wagmi v3 | Instalado en apps/web |
| Base de datos | Firebase Firestore | Activo (demo) |
| Auth | JWT custom (demo con users fijos) | Demo |
| Deploy web | Railway + Railpack | Auto en push |
| Deploy admin | Railway (pendiente) | Build OK |
| Monorepo | pnpm workspaces + Turborepo | Activo |

---

## 3. QUÉ FALTA — PRIORIDAD

### CRÍTICO (bloquea grants)

#### A. Deploy contratos en Celo MAINNET
- **Costo:** ~$0.15 USD en CELO real (gas fees)
- **Cómo:** Comprar 0.3 CELO en cualquier exchange (Binance, Coinbase) → enviar a `0x792E9F32b5EF9CF0Dcc5E66EaEB01A12E1bbbED9` → yo corro `pnpm deploy:celo` en 2 minutos
- **Por qué:** Celo Proof of Ship y Builders Fund requieren contratos en mainnet con MAUs reales
- **Comando listo:** `cd blockchain && npx hardhat run scripts/deploy.ts --network celo`

#### B. Deploy apps/admin en Railway
- El build ya funciona (arreglamos ESLint v8 y PORT variable)
- Falta: crear el servicio en Railway apuntando a `apps/admin/`
- Start command: `npm start`
- Puerto: 3010 (o Railway asigna PORT)

#### C. Integrar MiniPay en app móvil
- Actualmente `/minipay` es solo web
- MiniPay real corre dentro de Opera Mini en Android
- Necesita: URL pública + contrato en mainnet

### IMPORTANTE (para pitch y usuarios reales)

#### D. Backend NestJS real
- Auth real (JWT con base de datos)
- Wallet service (manejo de transacciones)
- Fiat bridge (conexión con bancos)
- Requiere inversión

#### E. Contratos bancarios reales
- Banrural GT: API de integración
- BAC Credomatic HN: sandbox
- STP / Conekta MX: onboarding
- Requiere inversión + proceso regulatorio

#### F. Cerrar Firestore security rules
- Actualmente en modo demo (solo 3 usuarios)
- Para producción: reglas basadas en JWT del backend real

#### G. Mobile app en stores
- App Store (iOS): $99/año Apple Developer
- Play Store (Android): $25 Google Developer
- Requiere: backend real funcionando primero

---

## 4. LEVANTAMIENTO DE CAPITAL

### Grants activos (sin dilución)
| Grant | Estado | Requisito clave |
|-------|--------|-----------------|
| Stellar SCF | Aplicado | — |
| **Celo Proof of Ship** | Pendiente | Contratos mainnet ✓ (falta mainnet deploy) |
| **Celo Builders Fund** | Pendiente | MAUs reales en Celo |
| SAFE round angels | Pendiente | — |
| YC S25 | Pendiente | — |

### Para desbloquear Celo grants HOY
1. Comprar 0.3 CELO (~$0.15 USD)
2. Deploy mainnet (2 minutos de mi parte)
3. Subir /minipay a producción
4. Conseguir primeros 10 usuarios reales usando MiniPay

---

## 5. ARQUITECTURA DE SEGURIDAD (para pitch)

| Capa | Implementación |
|------|---------------|
| Smart contract | Roles separados: MINTER, BURNER, PAUSER, COMPLIANCE |
| AML on-chain | Blacklist de addresses en contrato |
| KYC | Queue en panel admin (manual, luego automatizado) |
| Firestore | Reglas restrictivas por usuario demo |
| Admin panel | Aislado de la app de usuario |
| GAFILAT | Compliance framework documentado |
| Decimals | 2 decimals (como fiat, no 18 como crypto) |

---

## 6. RESUMEN PARA EL PITCH

**Lo que existe:**
- App web LIVE con 3 wallets demo GT/MX/HN
- P2P cross-country con FX real en tiempo real
- 21 bancos en panel admin
- Smart contracts ERC-20 deployados en Celo
- Integración MiniPay completa
- Pitch deck 15 slides bilingüe con export PDF

**Lo que falta para producción:**
- Backend real (requiere capital)
- Contratos bancarios reales (requiere capital + regulación)
- Deploy mainnet Celo ($0.15 USD — prácticamente gratis)

**El ask:** $500K–$1M seed para backend real + contratos bancarios + operaciones 12 meses

---

## 7. COMANDOS ÚTILES

```bash
# Desarrollo local
pnpm dev                          # arranca web (3000) + admin (3001)

# Blockchain
cd blockchain
npx hardhat compile               # compilar contratos
npx hardhat run scripts/deploy.ts --network celo-sepolia  # testnet
npx hardhat run scripts/deploy.ts --network celo          # MAINNET

# Web
cd apps/web
pnpm dev                          # puerto 3000
pnpm build                        # build producción
pnpm typecheck                    # verificar TypeScript

# Admin
cd apps/admin
pnpm dev                          # puerto 3010
pnpm build
```

---

## 8. ARCHIVOS CLAVE

| Archivo | Descripción |
|---------|-------------|
| `apps/web/src/lib/minipay.ts` | Integración MiniPay / viem |
| `apps/web/src/app/minipay/page.tsx` | Ruta /minipay — 6 pantallas |
| `apps/web/src/app/pitch/page.tsx` | Pitch deck 15 slides |
| `blockchain/contracts/MondegaCoin.sol` | ERC-20 + Factory + AML |
| `blockchain/scripts/deploy.ts` | Script de deploy todos los tokens |
| `blockchain/deployments/addresses.json` | Addresses Celo Sepolia |
| `blockchain/.env` | Private key deployer (NO en git) |
| `apps/web/.env.local` | Variables de entorno locales (NO en git) |
| `firestore.rules` | Reglas de seguridad Firestore |
| `CLAUDE.md` | Instrucciones para Claude Code |

---

*Generado: 2026-04-16*
