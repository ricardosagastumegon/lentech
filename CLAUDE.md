# LEN — CLAUDE.md
> Instrucciones para Claude Code al trabajar en este repositorio.

---

## Que es este proyecto

**LEN** es una red de monedas digitales regionales para el corredor
de comercio informal Mexico–Guatemala–Honduras.

- **Problema:** Los cambistas de frontera ofrecen mejores tipos de cambio
  que los bancos porque hacen conversion directa MXN↔GTQ↔HNL sin usar
  USD como intermediario. Es ilegal. LEN es la version digital y legal.
- **Solucion:** Tokens 1:1 a cada moneda local. FX bilateral sin USD.
- **Mercado:** Comercio informal MX–GT–HN. TAM $500M.
- **Nombre del repo:** MONDEGA (interno). La marca publica es **LEN**.
  No usar "Mondega" en UI, copy, o materiales externos.

---

## Tokens

| Token   | Pais      | Fiat | Estado       |
|---------|-----------|------|--------------|
| MEXCOIN | Mexico    | MXN  | Demo activo  |
| QUETZA  | Guatemala | GTQ  | Demo activo  |
| LEMPI   | Honduras  | HNL  | Demo activo  |
| COLON   | El Salvador | USD | Fase 2     |
| + 4 mas |           |      | Fase 3       |

---

## Stack

| Capa            | Tecnologia                        | Estado         |
|-----------------|-----------------------------------|----------------|
| Web frontend    | Next.js 14, TypeScript strict     | LIVE en Railway|
| Admin panel     | Next.js 14, TypeScript strict     | Built, sin deploy |
| Mobile          | React Native / Expo               | WIP            |
| Backend         | NestJS (planeado)                 | Scaffolded     |
| Smart contracts | Solidity 0.8.24, Hardhat          | Listo, sin deploy |
| Blockchain      | **Celo** (MiniPay) + Polygon (futuro) | Config lista |
| Base de datos   | Firebase Firestore (demo)         | Activo         |
| Auth            | JWT custom (demo usa users fijos) | Demo           |
| Deploy          | Railway + Nixpacks                | Auto en push   |
| Monorepo        | pnpm workspaces + Turborepo       | Activo         |

---

## Estructura del repo

```
mondega/
├── apps/
│   ├── web/          ← Next.js LIVE — app principal de usuario
│   ├── admin/        ← Next.js — panel operador (sin deploy aun)
│   └── mobile/       ← React Native — WIP
├── blockchain/
│   ├── contracts/MondegaCoin.sol  ← ERC-20 con mint/burn/AML
│   ├── scripts/deploy.ts          ← deploy a Celo o Polygon
│   ├── hardhat.config.ts          ← Alfajores + Celo mainnet + Amoy
│   └── .env.example               ← template de variables
├── packages/         ← sdk, shared-types, ui-components (scaffolded)
└── resumenes/        ← reportes tecnicos y brand guide
```

---

## Estado actual (Abril 2026)

### Hecho y funcionando
- App web LIVE: `https://web-production-1c372.up.railway.app`
- 3 wallets demo (GT/MX/HN) con P2P cross-country + FX real
- Sync cross-device en tiempo real (Firestore onSnapshot)
- Panel admin con 21 bancos, KYC/AML queue, parametros FX
- Pitch deck 15 slides bilingue en `/pitch` con export PDF
- Smart contracts escritos y compilables (ERC-20 + Factory + AML)
- Hardhat configurado para Celo Alfajores y mainnet

### En progreso — MiniPay Mexico
- `apps/web/src/lib/minipay.ts` — deteccion y utils MiniPay
- Pendiente: deploy MEXCOIN en Celo Alfajores
- Pendiente: integrar wagmi/viem en apps/web
- Pendiente: crear ruta `/minipay` en la web app

### Pendiente critico
- Deploy `apps/admin` en Railway
- Cerrar Firestore security rules (abiertas en modo demo)
- Contratos bancarios reales (Banrural GT, BAC HN, STP/Conekta MX)
- Backend real NestJS (auth, wallet, fiat-bridge)

---

## Paleta de colores LEN

```
--len-purple:  #4338CA   ← color principal, CTAs
--len-violet:  #818CF8   ← acento, texto secundario
--len-dark:    #1E1B4B   ← navy, fondo oscuro
--len-mid:     #312E81   ← gradiente intermedio
--len-light:   #EEF2FF   ← fondos claros
--len-border:  #E0E7FF   ← bordes
--len-surface: #F9FAFB   ← fondo neutro
Gradient: linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)
```

**Fuente:** Inter (400/500/600/700/800). No mezclar con otras fuentes.

---

## Reglas importantes

### Naming
- Marca publica: **LEN** (no Mondega en UI/copy)
- Repo/interno: **MONDEGA** (ok en codigo, variables, comentarios)
- Tokens: MEXCOIN, QUETZA, LEMPI (nombres exactos, respetarlos)

### Arquitectura MiniPay
- MiniPay es **distribucion y capa de wallet** para Mexico
- El usuario ve **LEN**, no MiniPay ni Celo
- Los bancos (Banrural, BAC, STP) son el on/off ramp real
- MiniPay/Celo corre atras como infraestructura invisible

### Smart contracts
- `MondegaCoin.sol` usa OpenZeppelin v5 — NO usar `_beforeTokenTransfer`
  (removido en v5, reemplazado por `_update`)
- Decimals = 2 (como fiat, no 18 como ETH)
- Siempre deploy via `MondegaFactory`, nunca directo
- Roles separados: MINTER, BURNER, PAUSER, COMPLIANCE

### Blockchain target
- **Prioridad 1:** Celo (MiniPay, LATAM, stablecoins)
- **Prioridad 2:** Polygon (futuro, expansion)
- Testnet Celo: Alfajores (chainId 44787)
- Mainnet Celo: chainId 42220

### No tocar
- `globals.css` — fuente unica de verdad de colores LEN
- Variables CSS `--len-*` — no crear duplicados en Tailwind
- `firebase.ts` — configuracion actual funciona en demo
- Firestore security rules — dejarlas como estan hasta produccion real

---

## Variables de entorno

### blockchain/.env (crear desde .env.example)
```
DEPLOYER_PRIVATE_KEY=0x...   ← wallet con CELO para gas
TREASURY_ADDRESS=0x...
COMPLIANCE_ADDRESS=0x...
```

### apps/web/.env.local
```
NEXT_PUBLIC_FIREBASE_*       ← ya configurado
NEXT_PUBLIC_CELO_ENV=alfajores   ← alfajores | mainnet
NEXT_PUBLIC_MEXCOIN_ADDRESS=0x...  ← llenar post-deploy
```

---

## Comandos utiles

```bash
# Desarrollo
pnpm dev                    # arranca todas las apps

# Blockchain
cd blockchain
pnpm install
pnpm compile                # compila contratos
pnpm deploy:alfajores       # deploy a testnet Celo
pnpm deploy:celo            # deploy a mainnet Celo

# Web
cd apps/web
pnpm dev                    # puerto 3000

# Admin
cd apps/admin
pnpm dev                    # puerto 3001
```

---

## Contexto de levantamiento de capital

El proyecto esta activamente buscando $500K–$1M seed:
- **Stellar SCF** — aplicado (grant sin dilucion)
- **Celo Proof of Ship** — pendiente (requiere MiniPay integration)
- **Celo Builders Fund** — pendiente (requiere MAUs reales)
- **SAFE round angels** — pendiente
- **YC S25** — pendiente

La integracion MiniPay Mexico es critica para desbloquear los grants de Celo.

---

*Actualizado: 2026-04-15*
